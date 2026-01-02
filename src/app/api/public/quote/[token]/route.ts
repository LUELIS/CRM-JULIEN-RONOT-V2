import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: {
        client: true,
        items: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis introuvable" },
        { status: 404 }
      )
    }

    // Get company settings from tenant
    const tenant = await prisma.tenants.findUnique({
      where: { id: BigInt(1) },
    })

    // Parse settings JSON if available
    let companySettings: Record<string, string> = {}
    if (tenant?.settings) {
      try {
        companySettings = JSON.parse(tenant.settings)
      } catch {
        // Ignore parse errors
      }
    }

    // Update view count
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        viewCount: quote.viewCount + 1,
        lastViewedAt: new Date(),
        first_viewed_at: quote.first_viewed_at || new Date(),
      },
    })

    return NextResponse.json({
      id: quote.id.toString(),
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      issueDate: quote.issueDate.toISOString(),
      validityDate: quote.validityDate.toISOString(),
      notes: quote.notes,
      termsConditions: quote.termsConditions,
      client: {
        companyName: quote.client.companyName,
        address: quote.client.address,
        postalCode: quote.client.postalCode,
        city: quote.client.city,
        email: quote.client.email,
        siret: quote.client.siret,
        vatNumber: quote.client.vatNumber,
      },
      company: {
        name: tenant?.name || companySettings.companyName || "Mon Entreprise",
        address: tenant?.address || companySettings.companyAddress || null,
        postalCode: companySettings.companyZip || null,
        city: companySettings.companyCity || null,
        siret: companySettings.companySiret || null,
        vatNumber: companySettings.companyVatNumber || null,
      },
      items: quote.items.map((item) => ({
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPriceHt: Number(item.unitPriceHt),
        vatRate: Number(item.vatRate),
        totalHt: Number(item.totalHt),
        totalTtc: Number(item.totalTtc),
      })),
      subtotalHt: Number(quote.subtotalHt),
      taxAmount: Number(quote.taxAmount),
      totalTtc: Number(quote.totalTtc),
    })
  } catch (error) {
    console.error("Error fetching public quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du devis" },
      { status: 500 }
    )
  }
}
