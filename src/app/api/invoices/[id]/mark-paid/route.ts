import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { paymentDate, paymentMethod, paymentNotes } = body

    const invoice = await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        status: "paid",
        paymentDate: new Date(paymentDate),
        paymentMethod,
        payment_notes: paymentNotes || null,
      },
    })

    return NextResponse.json({
      success: true,
      id: invoice.id.toString(),
    })
  } catch (error) {
    console.error("Error marking invoice as paid:", error)
    return NextResponse.json(
      { error: "Failed to mark invoice as paid" },
      { status: 500 }
    )
  }
}
