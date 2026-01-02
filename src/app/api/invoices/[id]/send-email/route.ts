import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { paymentMethod, debitDate, paymentLink } = body

    // Fetch invoice with client
    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Update invoice status to sent
    const updatedInvoice = await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        status: "sent",
        sentAt: new Date(),
        paymentMethod: paymentMethod,
        // Store debit date or payment link in notes or a separate field if needed
      },
      include: {
        client: true,
        items: true,
      },
    })

    // TODO: Implement actual email sending with nodemailer
    // For now, we just update the status
    console.log("Sending invoice email to:", invoice.client.email)
    console.log("Payment method:", paymentMethod)
    if (debitDate) console.log("Debit date:", debitDate)
    if (paymentLink) console.log("Payment link:", paymentLink)

    return NextResponse.json({
      id: updatedInvoice.id.toString(),
      invoiceNumber: updatedInvoice.invoiceNumber,
      status: updatedInvoice.status,
      clientId: updatedInvoice.clientId.toString(),
      issueDate: updatedInvoice.issueDate.toISOString(),
      dueDate: updatedInvoice.dueDate.toISOString(),
      paymentDate: updatedInvoice.paymentDate?.toISOString() || null,
      paymentTerms: Number(updatedInvoice.paymentTerms) || 30,
      notes: updatedInvoice.notes,
      totalHt: Number(updatedInvoice.subtotalHt),
      totalVat: Number(updatedInvoice.taxAmount),
      totalTtc: Number(updatedInvoice.totalTtc),
      createdAt: updatedInvoice.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: updatedInvoice.updatedAt?.toISOString() || new Date().toISOString(),
      client: {
        id: updatedInvoice.client.id.toString(),
        companyName: updatedInvoice.client.companyName,
        email: updatedInvoice.client.email,
        phone: updatedInvoice.client.phone,
        address: updatedInvoice.client.address,
        postalCode: updatedInvoice.client.postalCode,
        city: updatedInvoice.client.city,
        country: updatedInvoice.client.country,
        siret: updatedInvoice.client.siret,
        vatNumber: updatedInvoice.client.vatNumber,
        contactFirstname: updatedInvoice.client.contactFirstname,
        contactLastname: updatedInvoice.client.contactLastname,
      },
      items: updatedInvoice.items.map((item) => ({
        id: item.id.toString(),
        description: item.description,
        quantity: Number(item.quantity),
        unitPriceHt: Number(item.unitPriceHt),
        vatRate: Number(item.vatRate),
        totalHt: Number(item.totalHt),
        totalTtc: Number(item.totalTtc),
      })),
    })
  } catch (error) {
    console.error("Error sending invoice email:", error)
    return NextResponse.json(
      { error: "Failed to send invoice email" },
      { status: 500 }
    )
  }
}
