import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Get user with clientId
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        clientId: true,
        role: true,
      },
    })

    if (!user?.clientId || user.role !== "client") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      )
    }

    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: BigInt(id),
        clientId: user.clientId,
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            phone: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
          },
        },
        items: {
          orderBy: { id: "asc" },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Update view count
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate?.toISOString(),
      dueDate: invoice.dueDate?.toISOString(),
      paymentDate: invoice.paymentDate?.toISOString(),
      paymentMethod: invoice.paymentMethod,
      subtotalHt: Number(invoice.subtotalHt),
      taxAmount: Number(invoice.taxAmount),
      totalTtc: Number(invoice.totalTtc),
      discountType: invoice.discount_type,
      discountValue: Number(invoice.discount_value || 0),
      discountAmount: Number(invoice.discountAmount || 0),
      notes: invoice.notes,
      client: invoice.client,
      items: invoice.items.map((item) => ({
        id: item.id.toString(),
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceHt: Number(item.unitPriceHt),
        vatRate: Number(item.vatRate),
        totalHt: Number(item.totalHt),
        totalTtc: Number(item.totalTtc),
      })),
    })
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la facture" },
      { status: 500 }
    )
  }
}
