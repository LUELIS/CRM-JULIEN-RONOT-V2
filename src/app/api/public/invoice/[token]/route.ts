import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { publicToken: token },
      include: {
        client: true,
        items: true,
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture introuvable" },
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

    // Update view count and last viewed
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        viewCount: invoice.viewCount + 1,
        lastViewedAt: new Date(),
        first_viewed_at: invoice.first_viewed_at || new Date(),
      },
    })

    return NextResponse.json({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paymentMethod: invoice.paymentMethod,
      notes: invoice.notes,
      client: {
        companyName: invoice.client.companyName,
        address: invoice.client.address,
        postalCode: invoice.client.postalCode,
        city: invoice.client.city,
        email: invoice.client.email,
        siret: invoice.client.siret,
        vatNumber: invoice.client.vatNumber,
      },
      company: {
        name: tenant?.name || companySettings.companyName || "Mon Entreprise",
        address: tenant?.address || companySettings.companyAddress || null,
        postalCode: companySettings.companyZip || null,
        city: companySettings.companyCity || null,
        siret: companySettings.companySiret || null,
        vatNumber: companySettings.companyVatNumber || null,
      },
      items: invoice.items.map((item) => ({
        id: item.id.toString(),
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPriceHt: Number(item.unitPriceHt),
        vatRate: Number(item.vatRate),
        totalHt: Number(item.totalHt),
        totalTtc: Number(item.totalTtc),
      })),
      subtotalHt: Number(invoice.subtotalHt),
      taxAmount: Number(invoice.taxAmount),
      discountAmount: Number(invoice.discountAmount),
      totalTtc: Number(invoice.totalTtc),
    })
  } catch (error) {
    console.error("Error fetching public invoice:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la facture" },
      { status: 500 }
    )
  }
}
