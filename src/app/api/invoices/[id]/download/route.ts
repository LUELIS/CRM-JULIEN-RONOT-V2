import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDF, InvoiceData, TenantData, SettingsData } from "@/lib/pdf/invoice-pdf"
import React from "react"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    let rawSettings: Record<string, unknown> = {}
    try {
      if (tenant?.settings) {
        rawSettings = JSON.parse(tenant.settings)
      }
    } catch {
      rawSettings = {}
    }

    // Prepare data for PDF
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status || "draft",
      notes: invoice.notes || undefined,
      subtotalHt: Number(invoice.subtotalHt),
      taxAmount: Number(invoice.taxAmount),
      discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : undefined,
      totalTtc: Number(invoice.totalTtc),
      client: {
        companyName: invoice.client.companyName,
        address: invoice.client.address || undefined,
        postalCode: invoice.client.postalCode || undefined,
        city: invoice.client.city || undefined,
        email: invoice.client.email || undefined,
        siret: invoice.client.siret || undefined,
      },
      items: invoice.items.map((item) => ({
        description: item.description || "",
        quantity: typeof item.quantity === "object" && "toNumber" in item.quantity
          ? (item.quantity as { toNumber: () => number }).toNumber()
          : Number(item.quantity),
        unit: item.unit || "unité",
        unitPriceHt: typeof item.unitPriceHt === "object" && "toNumber" in item.unitPriceHt
          ? (item.unitPriceHt as { toNumber: () => number }).toNumber()
          : Number(item.unitPriceHt),
        vatRate: typeof item.vatRate === "object" && "toNumber" in item.vatRate
          ? (item.vatRate as { toNumber: () => number }).toNumber()
          : Number(item.vatRate),
        totalHt: typeof item.totalHt === "object" && "toNumber" in item.totalHt
          ? (item.totalHt as { toNumber: () => number }).toNumber()
          : Number(item.totalHt),
        service: item.service ? { name: item.service.name } : undefined,
      })),
    }

    // Build logo path for React-PDF (needs absolute file path)
    let logoPath: string | null = null
    if (tenant?.logo) {
      const absoluteLogoPath = join(process.cwd(), "public", "uploads", tenant.logo)
      if (existsSync(absoluteLogoPath)) {
        logoPath = absoluteLogoPath
      }
    }

    const tenantData: TenantData = {
      name: tenant?.name || "Mon Entreprise",
      address: tenant?.address || undefined,
      email: tenant?.email || undefined,
      phone: tenant?.phone || undefined,
      logo: logoPath,
    }

    const settingsData: SettingsData = {
      postalCode: (rawSettings.postalCode || rawSettings.postal_code) as string | undefined,
      city: rawSettings.city as string | undefined,
      siret: rawSettings.siret as string | undefined,
      iban: (rawSettings.iban || rawSettings.bank_iban) as string | undefined,
      bic: (rawSettings.bic || rawSettings.bank_bic) as string | undefined,
      bankName: (rawSettings.bankName || rawSettings.bank_name) as string | undefined,
      paymentTerms: (rawSettings.paymentTerms || rawSettings.payment_terms) as number | undefined,
      lateFee: (rawSettings.lateFee || rawSettings.late_fee) as number | undefined,
      invoiceFooter: (rawSettings.invoiceFooter || rawSettings.invoice_footer_text) as string | undefined,
    }

    // Generate PDF buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoice: invoiceData,
        tenant: tenantData,
        settings: settingsData,
      }) as any
    )

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)

    // Return PDF with proper headers
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Facture-${invoice.invoiceNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF", details: String(error) },
      { status: 500 }
    )
  }
}
