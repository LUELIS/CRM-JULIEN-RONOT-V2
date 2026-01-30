/**
 * PAIN.001 - SEPA Credit Transfer Generation
 * Generates XML file for mass SEPA transfers (refunds/payments)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TENANT_ID = BigInt(1)

interface TransferItem {
  invoiceId: string
  amount: number
  clientName: string
  iban: string
  bic: string
  reference: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceIds, executionDate } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Aucune facture sélectionnée" },
        { status: 400 }
      )
    }

    // Get tenant settings for SEPA config
    const tenant = await prisma.tenants.findFirst({
      where: { id: TENANT_ID },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant non trouvé" },
        { status: 404 }
      )
    }

    const settings = tenant.settings ? JSON.parse(tenant.settings as string) : {}

    // SEPA settings are stored directly on settings object
    const sepaCreditorIban = settings.sepaCreditorIban
    const sepaCreditorBic = settings.sepaCreditorBic
    const sepaCreditorName = settings.sepaCreditorName

    if (!sepaCreditorIban || !sepaCreditorBic || !sepaCreditorName) {
      return NextResponse.json(
        { error: "Configuration SEPA incomplète. Veuillez configurer vos informations bancaires dans Paramètres > SEPA." },
        { status: 400 }
      )
    }

    // Get invoices (credit notes with negative amounts)
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds.map((id: string) => BigInt(id)) },
        tenant_id: TENANT_ID,
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            iban: true,
            bic: true,
          },
        },
      },
    })

    // Validate all invoices have valid SEPA info
    const transfers: TransferItem[] = []
    const errors: string[] = []

    for (const invoice of invoices) {
      if (!invoice.client.iban || !invoice.client.bic) {
        errors.push(`${invoice.invoiceNumber}: IBAN/BIC client manquant`)
        continue
      }

      // For credit notes (avoirs), amount is negative, we transfer the absolute value
      const amount = Math.abs(Number(invoice.totalTtc))

      if (amount <= 0) {
        errors.push(`${invoice.invoiceNumber}: Montant invalide`)
        continue
      }

      transfers.push({
        invoiceId: invoice.id.toString(),
        amount,
        clientName: invoice.client.companyName,
        iban: invoice.client.iban,
        bic: invoice.client.bic,
        reference: invoice.invoiceNumber,
      })
    }

    if (transfers.length === 0) {
      return NextResponse.json(
        { error: "Aucun virement valide à générer", details: errors },
        { status: 400 }
      )
    }

    // Generate PAIN.001 XML
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0)
    const msgId = `VIRT-${Date.now()}`
    const creationDateTime = new Date().toISOString()
    const reqExecutionDate = executionDate || new Date().toISOString().split("T")[0]

    const xml = generatePain001XML({
      msgId,
      creationDateTime,
      numberOfTransactions: transfers.length,
      controlSum: totalAmount,
      initiatorName: sepaCreditorName,
      debtorName: sepaCreditorName,
      debtorIban: sepaCreditorIban,
      debtorBic: sepaCreditorBic,
      requestedExecutionDate: reqExecutionDate,
      transfers,
    })

    // Return XML as downloadable file
    const filename = `SEPA_CT_${new Date().toISOString().split("T")[0]}_${transfers.length}virt.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error generating PAIN.001:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du fichier SEPA" },
      { status: 500 }
    )
  }
}

interface Pain001Params {
  msgId: string
  creationDateTime: string
  numberOfTransactions: number
  controlSum: number
  initiatorName: string
  debtorName: string
  debtorIban: string
  debtorBic: string
  requestedExecutionDate: string
  transfers: TransferItem[]
}

function generatePain001XML(params: Pain001Params): string {
  const {
    msgId,
    creationDateTime,
    numberOfTransactions,
    controlSum,
    initiatorName,
    debtorName,
    debtorIban,
    debtorBic,
    requestedExecutionDate,
    transfers,
  } = params

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents

  const formatAmount = (amount: number) => amount.toFixed(2)

  const creditTransferTxInf = transfers
    .map(
      (transfer, index) => `
        <CdtTrfTxInf>
          <PmtId>
            <EndToEndId>${escapeXml(transfer.reference)}</EndToEndId>
          </PmtId>
          <Amt>
            <InstdAmt Ccy="EUR">${formatAmount(transfer.amount)}</InstdAmt>
          </Amt>
          <CdtrAgt>
            <FinInstnId>
              <BIC>${transfer.bic}</BIC>
            </FinInstnId>
          </CdtrAgt>
          <Cdtr>
            <Nm>${escapeXml(transfer.clientName.substring(0, 70))}</Nm>
          </Cdtr>
          <CdtrAcct>
            <Id>
              <IBAN>${transfer.iban.replace(/\s/g, "")}</IBAN>
            </Id>
          </CdtrAcct>
          <RmtInf>
            <Ustrd>Remboursement ${escapeXml(transfer.reference)}</Ustrd>
          </RmtInf>
        </CdtTrfTxInf>`
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${formatAmount(controlSum)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(initiatorName.substring(0, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${formatAmount(controlSum)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${requestedExecutionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(debtorName.substring(0, 70))}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${debtorIban.replace(/\s/g, "")}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${debtorBic}</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${creditTransferTxInf}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
}
