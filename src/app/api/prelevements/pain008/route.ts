import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Helper to format date as ISO datetime
function formatDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

// Helper to generate unique message ID
function generateMsgId(): string {
  const date = new Date()
  const timestamp = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MSG${timestamp}${random}`
}

// Helper to escape XML entities
function escapeXml(str: string): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Helper to format amount (2 decimal places)
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

// POST: Generate PAIN.008 XML file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceIds, requestedCollectionDate } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Aucune facture sélectionnée" },
        { status: 400 }
      )
    }

    // Get tenant settings for creditor info
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.json(
        { error: "Paramètres du tenant non configurés" },
        { status: 400 }
      )
    }

    let settings: Record<string, string> = {}
    try {
      settings = JSON.parse(tenant.settings)
    } catch {
      return NextResponse.json(
        { error: "Erreur lors de la lecture des paramètres" },
        { status: 500 }
      )
    }

    const { sepaIcs, sepaCreditorName, sepaCreditorIban, sepaCreditorBic } = settings

    if (!sepaIcs || !sepaCreditorName || !sepaCreditorIban || !sepaCreditorBic) {
      return NextResponse.json(
        { error: "Informations SEPA créancier incomplètes. Vérifiez les paramètres SEPA dans Intégrations." },
        { status: 400 }
      )
    }

    // Get invoices with client info
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds.map((id: string) => BigInt(id)) },
        tenant_id: BigInt(1),
        paymentMethod: { in: ["prelevement", "prelevement_sepa", "debit"] },
        debit_date: { not: null },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            iban: true,
            bic: true,
            sepaMandate: true,
            sepaMandateDate: true,
            sepaSequenceType: true,
          },
        },
      },
    })

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: "Aucune facture valide trouvée" },
        { status: 400 }
      )
    }

    // Validate all invoices have valid SEPA info
    const invalidInvoices = invoices.filter(
      (inv) =>
        !inv.client.iban ||
        !inv.client.bic ||
        !inv.client.sepaMandate ||
        !inv.client.sepaMandateDate
    )

    if (invalidInvoices.length > 0) {
      return NextResponse.json(
        {
          error: `${invalidInvoices.length} facture(s) ont des informations SEPA incomplètes`,
          invalidInvoices: invalidInvoices.map((inv) => ({
            id: inv.id.toString(),
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.client.companyName,
          })),
        },
        { status: 400 }
      )
    }

    // Calculate totals
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalTtc), 0)
    const nbOfTxs = invoices.length

    // Determine collection date
    const collectionDate = requestedCollectionDate
      ? new Date(requestedCollectionDate)
      : invoices[0].debit_date || new Date()

    // Generate unique IDs
    const msgId = generateMsgId()
    const pmtInfId = `PMT${msgId.slice(3)}`
    const creationDateTime = formatDateTime(new Date())

    // Build PAIN.008 XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(sepaCreditorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${formatDate(collectionDate)}</ReqdColltnDt>
      <Cdtr>
        <Nm>${escapeXml(sepaCreditorName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${escapeXml(sepaCreditorIban)}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <BIC>${escapeXml(sepaCreditorBic)}</BIC>
        </FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${escapeXml(sepaIcs)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
${invoices
  .map((invoice, index) => {
    const endToEndId = `${invoice.invoiceNumber}-${Date.now()}`
    const mandateDate = invoice.client.sepaMandateDate
      ? formatDate(new Date(invoice.client.sepaMandateDate))
      : formatDate(new Date())
    const seqType = invoice.client.sepaSequenceType || "RCUR"

    return `      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${formatAmount(Number(invoice.totalTtc))}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(invoice.client.sepaMandate || "")}</MndtId>
            <DtOfSgntr>${mandateDate}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <BIC>${escapeXml(invoice.client.bic || "")}</BIC>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${escapeXml(invoice.client.companyName)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${escapeXml(invoice.client.iban || "")}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>Facture ${escapeXml(invoice.invoiceNumber)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`
  })
  .join("\n")}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`

    // Return the XML file
    const filename = `SEPA_DD_${formatDate(new Date())}_${msgId}.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error generating PAIN.008:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du fichier PAIN.008" },
      { status: 500 }
    )
  }
}
