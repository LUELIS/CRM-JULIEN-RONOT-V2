import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { years = 1, customPrice } = body

    // Get domain with client
    const domain = await prisma.domain.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: BigInt(1),
      },
      include: {
        client: true,
      },
    })

    if (!domain) {
      return NextResponse.json(
        { error: "Domaine non trouve" },
        { status: 404 }
      )
    }

    if (!domain.client) {
      return NextResponse.json(
        { error: "Ce domaine n'est pas associe a un client" },
        { status: 400 }
      )
    }

    // Calculate price - default renewal price is 15€ if not specified
    const defaultRenewalPrice = 15
    const unitPrice = customPrice || defaultRenewalPrice
    const totalHt = unitPrice * years
    const vatRate = 20
    const vatAmount = (totalHt * vatRate) / 100
    const totalTtc = totalHt + vatAmount

    // Generate invoice number
    const year = new Date().getFullYear()
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `F${year}-`,
        },
      },
      orderBy: {
        invoiceNumber: "desc",
      },
    })

    let nextNumber = 1
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/F\d{4}-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const invoiceNumber = `F${year}-${String(nextNumber).padStart(4, "0")}`

    // Create invoice with item
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        tenant_id: BigInt(1),
        clientId: domain.clientId!,
        status: "draft",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotalHt: totalHt,
        taxAmount: vatAmount,
        totalTtc,
        notes: `Renouvellement du domaine ${domain.domain} pour ${years} an(s)`,
        items: {
          create: [
            {
              tenant_id: BigInt(1),
              description: `Renouvellement nom de domaine ${domain.domain}`,
              quantity: years,
              unit: "an",
              unitPriceHt: unitPrice,
              vatRate: vatRate,
              taxAmount: vatAmount,
              totalHt: totalHt,
              totalTtc: totalTtc,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        totalTtc: Number(invoice.totalTtc),
      },
    })
  } catch (error) {
    console.error("Error creating renewal invoice:", error)
    return NextResponse.json(
      { error: "Erreur lors de la creation de la facture" },
      { status: 500 }
    )
  }
}
