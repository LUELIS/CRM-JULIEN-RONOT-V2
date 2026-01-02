import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const transaction = await prisma.recurringTransaction.findUnique({
      where: { id: BigInt(id) },
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true,
          },
        },
        clients: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvee" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: transaction.id.toString(),
      name: transaction.name,
      description: transaction.description,
      amount: Number(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      frequency: transaction.frequency,
      interval: transaction.interval,
      nextOccurrence: transaction.next_occurrence?.toISOString() || null,
      status: transaction.status,
    })
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la transaction" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const transaction = await prisma.recurringTransaction.update({
      where: { id: BigInt(id) },
      data: {
        name: body.name,
        description: body.description || null,
        amount: body.amount,
        frequency: body.frequency,
        next_occurrence: body.nextOccurrence ? new Date(body.nextOccurrence) : undefined,
        status: body.status,
        category: body.category || null,
      },
    })

    return NextResponse.json({
      id: transaction.id.toString(),
      name: transaction.name,
      success: true,
    })
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la transaction" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.recurringTransaction.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la transaction" },
      { status: 500 }
    )
  }
}
