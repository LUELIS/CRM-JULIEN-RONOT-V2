import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper to transform quote to JSON response
function transformQuote(quote: Awaited<ReturnType<typeof prisma.quote.findUnique>> & {
  client: Awaited<ReturnType<typeof prisma.client.findUnique>>
  items: Awaited<ReturnType<typeof prisma.quoteItem.findMany>>
  views?: Awaited<ReturnType<typeof prisma.quoteView.findMany>>
}) {
  if (!quote || !quote.client) return null

  return {
    id: quote.id.toString(),
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    clientId: quote.clientId.toString(),
    issueDate: quote.issueDate.toISOString(),
    validUntil: quote.validityDate.toISOString(),
    notes: quote.notes,
    termsConditions: quote.termsConditions,
    publicToken: quote.publicToken,
    totalHt: Number(quote.subtotalHt),
    totalVat: Number(quote.taxAmount),
    totalTtc: Number(quote.totalTtc),
    convertedInvoiceId: quote.invoiceId?.toString() || null,
    viewCount: quote.viewCount,
    firstViewedAt: quote.first_viewed_at?.toISOString() || null,
    lastViewedAt: quote.lastViewedAt?.toISOString() || null,
    sentAt: quote.sent_at?.toISOString() || null,
    signedAt: quote.signed_at?.toISOString() || null,
    signedByName: quote.signed_by_name,
    rejectedAt: quote.rejectedAt?.toISOString() || null,
    rejectionReason: quote.rejection_reason,
    createdAt: quote.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: quote.updatedAt?.toISOString() || new Date().toISOString(),
    client: {
      id: quote.client.id.toString(),
      companyName: quote.client.companyName,
      email: quote.client.email,
      phone: quote.client.phone,
      address: quote.client.address,
      postalCode: quote.client.postalCode,
      city: quote.client.city,
      country: quote.client.country,
      siret: quote.client.siret,
      vatNumber: quote.client.vatNumber,
      contactFirstname: quote.client.contactFirstname,
      contactLastname: quote.client.contactLastname,
    },
    items: quote.items.map((item) => ({
      id: item.id.toString(),
      serviceId: item.serviceId?.toString() || null,
      description: item.description,
      quantity: Number(item.quantity),
      unitPriceHt: Number(item.unitPriceHt),
      vatRate: Number(item.vatRate),
      totalHt: Number(item.totalHt),
      totalTtc: Number(item.totalTtc),
    })),
    views: quote.views?.map((view) => ({
      id: view.id.toString(),
      viewedAt: view.viewedAt.toISOString(),
      ipAddress: view.ipAddress,
      browser: view.browser,
      platform: view.platform,
      city: view.city,
      country: view.country,
    })) || [],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const quote = await prisma.quote.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
        views: {
          orderBy: { viewedAt: "desc" },
          take: 10,
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    return NextResponse.json(transformQuote(quote as Parameters<typeof transformQuote>[0]))
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    // Handle actions
    if (body.action) {
      switch (body.action) {
        case "markDraft": {
          const draftQuote = await prisma.quote.update({
            where: { id: BigInt(id) },
            data: { status: "draft" },
            include: { client: true, items: true, views: { orderBy: { viewedAt: "desc" }, take: 10 } },
          })
          return NextResponse.json(transformQuote(draftQuote as Parameters<typeof transformQuote>[0]))
        }

        case "markAccepted": {
          const acceptedQuote = await prisma.quote.update({
            where: { id: BigInt(id) },
            data: { status: "accepted" },
            include: { client: true, items: true, views: { orderBy: { viewedAt: "desc" }, take: 10 } },
          })
          return NextResponse.json(transformQuote(acceptedQuote as Parameters<typeof transformQuote>[0]))
        }

        case "markRejected": {
          const rejectedQuote = await prisma.quote.update({
            where: { id: BigInt(id) },
            data: {
              status: "rejected",
              rejectedAt: new Date(),
              rejection_reason: body.rejectionReason || null,
            },
            include: { client: true, items: true, views: { orderBy: { viewedAt: "desc" }, take: 10 } },
          })
          return NextResponse.json(transformQuote(rejectedQuote as Parameters<typeof transformQuote>[0]))
        }

        case "markSent": {
          const sentQuote = await prisma.quote.update({
            where: { id: BigInt(id) },
            data: { status: "sent", sent_at: new Date() },
            include: { client: true, items: true, views: { orderBy: { viewedAt: "desc" }, take: 10 } },
          })
          return NextResponse.json(transformQuote(sentQuote as Parameters<typeof transformQuote>[0]))
        }

        case "convertToInvoice":
          const quote = await prisma.quote.findUnique({
            where: { id: BigInt(id) },
            include: { items: true },
          })

          if (!quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 })
          }

          // Generate invoice number
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { id: "desc" },
            select: { invoiceNumber: true },
          })

          let nextNumber = 1
          if (lastInvoice?.invoiceNumber) {
            const match = lastInvoice.invoiceNumber.match(/(\d+)$/)
            if (match) nextNumber = parseInt(match[1]) + 1
          }

          const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`

          // Create invoice from quote
          const invoice = await prisma.invoice.create({
            data: {
              tenant_id: quote.tenant_id,
              clientId: quote.clientId,
              invoiceNumber,
              status: "draft",
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              subtotalHt: quote.subtotalHt,
              taxAmount: quote.taxAmount,
              totalTtc: quote.totalTtc,
              notes: quote.notes,
              items: {
                create: quote.items.map((item) => ({
                  tenant_id: quote.tenant_id,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPriceHt: item.unitPriceHt,
                  vatRate: item.vatRate,
                  taxAmount: Number(item.quantity) * Number(item.unitPriceHt) * (Number(item.vatRate) / 100),
                  totalHt: item.totalHt,
                  totalTtc: item.totalTtc,
                  serviceId: item.serviceId,
                })),
              },
            },
          })

          // Update quote and link to invoice (keep accepted status)
          await prisma.quote.update({
            where: { id: BigInt(id) },
            data: {
              status: "accepted",
              invoiceId: invoice.id,
            },
          })

          return NextResponse.json({
            success: true,
            invoiceId: invoice.id.toString(),
            invoiceNumber: invoice.invoiceNumber,
          })

        case "duplicate":
          const original = await prisma.quote.findUnique({
            where: { id: BigInt(id) },
            include: { items: true },
          })

          if (!original) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 })
          }

          // Generate new number
          const lastQuote = await prisma.quote.findFirst({
            orderBy: { id: "desc" },
            select: { quoteNumber: true },
          })

          let nextQuoteNumber = 1
          if (lastQuote?.quoteNumber) {
            const match = lastQuote.quoteNumber.match(/(\d+)$/)
            if (match) nextQuoteNumber = parseInt(match[1]) + 1
          }

          const quoteNumber = `DEV-${new Date().getFullYear()}-${String(nextQuoteNumber).padStart(5, "0")}`

          const duplicate = await prisma.quote.create({
            data: {
              tenant_id: original.tenant_id,
              clientId: original.clientId,
              quoteNumber,
              status: "draft",
              issueDate: new Date(),
              validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              subtotalHt: original.subtotalHt,
              taxAmount: original.taxAmount,
              totalTtc: original.totalTtc,
              notes: original.notes,
              items: {
                create: original.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPriceHt: item.unitPriceHt,
                  vatRate: item.vatRate,
                  totalHt: item.totalHt,
                  totalTtc: item.totalTtc,
                  serviceId: item.serviceId,
                })),
              },
            },
          })

          return NextResponse.json({
            id: duplicate.id.toString(),
            quoteNumber: duplicate.quoteNumber,
            success: true,
          })

        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 })
      }
    }

    // Regular update
    let subtotalHt = 0
    let taxAmount = 0

    const items = body.items || []
    items.forEach((item: { quantity: number; unitPriceHt: number; vatRate: number }) => {
      const lineTotal = item.quantity * item.unitPriceHt
      subtotalHt += lineTotal
      taxAmount += lineTotal * (item.vatRate / 100)
    })

    const totalTtc = subtotalHt + taxAmount

    // Delete existing items and recreate
    await prisma.quoteItem.deleteMany({
      where: { quoteId: BigInt(id) },
    })

    await prisma.quote.update({
      where: { id: BigInt(id) },
      data: {
        clientId: BigInt(body.clientId),
        status: body.status,
        issueDate: new Date(body.issueDate),
        validityDate: new Date(body.validUntil),
        subtotalHt,
        taxAmount,
        totalTtc,
        notes: body.notes,
        items: {
          create: items.map((item: {
            description: string
            quantity: number
            unit?: string
            unitPriceHt: number
            vatRate: number
            serviceId?: string
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "unité",
            unitPriceHt: item.unitPriceHt,
            vatRate: item.vatRate || 20,
            totalHt: item.quantity * item.unitPriceHt,
            totalTtc: item.quantity * item.unitPriceHt * (1 + item.vatRate / 100),
            serviceId: item.serviceId ? BigInt(item.serviceId) : null,
          })),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.quote.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quote:", error)
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 })
  }
}
