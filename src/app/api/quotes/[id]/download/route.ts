import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { QuotePDF, QuoteData, TenantData, SettingsData } from "@/lib/pdf/quote-pdf"
import React from "react"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis non trouvé" },
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
    const quoteData: QuoteData = {
      quoteNumber: quote.quoteNumber,
      issueDate: quote.issueDate,
      validityDate: quote.validityDate,
      status: quote.status || "draft",
      notes: quote.notes || undefined,
      termsConditions: quote.termsConditions || undefined,
      subtotalHt: Number(quote.subtotalHt),
      taxAmount: Number(quote.taxAmount),
      totalTtc: Number(quote.totalTtc),
      client: {
        companyName: quote.client.companyName,
        address: quote.client.address || undefined,
        postalCode: quote.client.postalCode || undefined,
        city: quote.client.city || undefined,
        email: quote.client.email || undefined,
        siret: quote.client.siret || undefined,
      },
      items: quote.items.map((item) => ({
        title: item.title || "",
        description: item.description || "",
        quantity: typeof item.quantity === "object" && "toNumber" in item.quantity
          ? (item.quantity as { toNumber: () => number }).toNumber()
          : Number(item.quantity),
        unitPriceHt: typeof item.unitPriceHt === "object" && "toNumber" in item.unitPriceHt
          ? (item.unitPriceHt as { toNumber: () => number }).toNumber()
          : Number(item.unitPriceHt),
        totalHt: typeof item.totalHt === "object" && "toNumber" in item.totalHt
          ? (item.totalHt as { toNumber: () => number }).toNumber()
          : Number(item.totalHt),
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
      quoteFooter: (rawSettings.quoteFooter || rawSettings.quote_footer_text) as string | undefined,
    }

    // Generate PDF buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotePDF, {
        quote: quoteData,
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
        "Content-Disposition": `attachment; filename="Devis-${quote.quoteNumber}.pdf"`,
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
