import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { paymentMethod, debitDate, paymentLink } = body

    // Generate public token if not exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      select: { publicToken: true },
    })

    const publicToken = existingInvoice?.publicToken || crypto.randomBytes(32).toString("hex")

    // Update invoice with send info
    const invoice = await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        status: "sent",
        sentAt: new Date(),
        paymentMethod,
        debit_date: debitDate ? new Date(debitDate) : null,
        payment_link: paymentLink || null,
        publicToken,
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            contactEmail: true,
          },
        },
      },
    })

    // TODO: Implement actual email sending here
    // This would involve:
    // 1. Loading email template
    // 2. Generating PDF
    // 3. Sending email via SMTP or email service

    return NextResponse.json({
      success: true,
      id: invoice.id.toString(),
      publicToken,
      message: "Facture marquée comme envoyée",
    })
  } catch (error) {
    console.error("Error sending invoice:", error)
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    )
  }
}
