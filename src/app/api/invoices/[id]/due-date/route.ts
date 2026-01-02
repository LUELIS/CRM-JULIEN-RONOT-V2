import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { dueDate } = body

    if (!dueDate) {
      return NextResponse.json(
        { error: "La date d'échéance est requise" },
        { status: 400 }
      )
    }

    // Find the invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: BigInt(1),
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Check if invoice can be modified (not paid or cancelled)
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Impossible de modifier une facture payée ou annulée" },
        { status: 400 }
      )
    }

    // Update the due date
    const updatedInvoice = await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        dueDate: new Date(dueDate),
      },
    })

    return NextResponse.json({
      success: true,
      dueDate: updatedInvoice.dueDate?.toISOString(),
    })
  } catch (error) {
    console.error("Error updating due date:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification de la date d'échéance" },
      { status: 500 }
    )
  }
}
