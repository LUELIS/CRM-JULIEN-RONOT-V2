import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
        lastInvoice: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    const transformedItems = subscription.items.map((item) => ({
      id: item.id.toString(),
      serviceId: item.serviceId?.toString() || null,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceHt: Number(item.unitPriceHt),
      taxRate: Number(item.tax_rate),
      totalHt: Number(item.total_ht),
      totalTtc: Number(item.total_ttc),
    }))

    return NextResponse.json({
      id: subscription.id.toString(),
      subscriptionNumber: subscription.subscriptionNumber,
      name: subscription.name,
      description: subscription.description,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      customDays: subscription.customDays,
      startDate: subscription.startDate.toISOString(),
      nextBillingDate: subscription.nextBillingDate.toISOString(),
      endDate: subscription.endDate?.toISOString() || null,
      amountHt: Number(subscription.amountHt),
      taxRate: Number(subscription.taxRate),
      amountTtc: Number(subscription.amountTtc),
      autoInvoice: subscription.autoInvoice,
      autoSend: subscription.autoSend,
      invoiceDaysBefore: subscription.invoiceDaysBefore,
      lastInvoiceDate: subscription.lastInvoiceDate?.toISOString() || null,
      lastInvoiceId: subscription.lastInvoiceId?.toString() || null,
      totalInvoicesGenerated: subscription.totalInvoicesGenerated,
      notes: subscription.notes,
      clientId: subscription.clientId.toString(),
      client: {
        id: subscription.client.id.toString(),
        companyName: subscription.client.companyName,
        email: subscription.client.email,
        phone: subscription.client.phone,
        address: subscription.client.address,
        postalCode: subscription.client.postalCode,
        city: subscription.client.city,
        country: subscription.client.country,
        siret: subscription.client.siret,
        vatNumber: subscription.client.vatNumber,
      },
      items: transformedItems,
      lastInvoice: subscription.lastInvoice
        ? {
            id: subscription.lastInvoice.id.toString(),
            invoiceNumber: subscription.lastInvoice.invoiceNumber,
            status: subscription.lastInvoice.status,
            totalTtc: Number(subscription.lastInvoice.totalTtc),
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
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
        case "pause":
          await prisma.subscription.update({
            where: { id: BigInt(id) },
            data: { status: "paused" },
          })
          break

        case "resume":
          await prisma.subscription.update({
            where: { id: BigInt(id) },
            data: { status: "active" },
          })
          break

        case "cancel":
          await prisma.subscription.update({
            where: { id: BigInt(id) },
            data: { status: "cancelled", endDate: new Date() },
          })
          break

        case "generateInvoice":
          const subscription = await prisma.subscription.findUnique({
            where: { id: BigInt(id) },
            include: { items: true },
          })

          if (!subscription) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
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

          // Create invoice
          const invoice = await prisma.invoice.create({
            data: {
              tenant_id: subscription.tenant_id,
              clientId: subscription.clientId,
              invoiceNumber,
              status: "draft",
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              subtotalHt: subscription.amountHt,
              taxAmount: Number(subscription.amountTtc) - Number(subscription.amountHt),
              totalTtc: subscription.amountTtc,
              notes: `Facture générée automatiquement pour l'abonnement ${subscription.subscriptionNumber}`,
              items: {
                create: subscription.items.map((item) => ({
                  tenant_id: subscription.tenant_id,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit || "unité",
                  unitPriceHt: item.unitPriceHt,
                  vatRate: item.tax_rate,
                  taxAmount: Number(item.total_ttc) - Number(item.total_ht),
                  totalHt: item.total_ht,
                  totalTtc: item.total_ttc,
                  serviceId: item.serviceId,
                })),
              },
            },
          })

          // Calculate next billing date
          let nextBillingDate = new Date(subscription.nextBillingDate)
          switch (subscription.billingCycle) {
            case "monthly":
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
              break
            case "quarterly":
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
              break
            case "biannual":
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 6)
              break
            case "yearly":
              nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
              break
            case "custom":
              nextBillingDate.setDate(nextBillingDate.getDate() + (subscription.customDays || 30))
              break
          }

          // Update subscription
          await prisma.subscription.update({
            where: { id: BigInt(id) },
            data: {
              lastInvoiceDate: new Date(),
              lastInvoiceId: invoice.id,
              nextBillingDate,
              totalInvoicesGenerated: subscription.totalInvoicesGenerated + 1,
            },
          })

          return NextResponse.json({
            success: true,
            invoiceId: invoice.id.toString(),
            invoiceNumber: invoice.invoiceNumber,
          })

        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    // Regular update
    const {
      clientId,
      name,
      description,
      billingCycle,
      customDays,
      startDate,
      endDate,
      taxRate,
      autoInvoice,
      autoSend,
      invoiceDaysBefore,
      notes,
      items,
    } = body

    // Calculate totals
    let amountHt = 0
    const itemsData = items || []
    itemsData.forEach((item: { quantity: number; unitPriceHt: number }) => {
      amountHt += item.quantity * item.unitPriceHt
    })
    const amountTtc = amountHt * (1 + (taxRate || 20) / 100)

    // Delete existing items and recreate
    await prisma.subscriptionItem.deleteMany({
      where: { subscriptionId: BigInt(id) },
    })

    await prisma.subscription.update({
      where: { id: BigInt(id) },
      data: {
        clientId: BigInt(clientId),
        name,
        description: description || null,
        billingCycle,
        customDays: billingCycle === "custom" ? customDays : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        amountHt,
        taxRate: taxRate || 20,
        amountTtc,
        autoInvoice: autoInvoice !== false,
        autoSend: autoSend || false,
        invoiceDaysBefore: invoiceDaysBefore || 0,
        notes,
        items: {
          create: itemsData.map((item: {
            description: string
            quantity: number
            unit?: string
            unitPriceHt: number
            taxRate?: number
            serviceId?: string
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "unité",
            unitPriceHt: item.unitPriceHt,
            tax_rate: item.taxRate || taxRate || 20,
            total_ht: item.quantity * item.unitPriceHt,
            total_ttc: item.quantity * item.unitPriceHt * (1 + (item.taxRate || taxRate || 20) / 100),
            serviceId: item.serviceId ? BigInt(item.serviceId) : null,
          })),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating subscription:", error)
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.subscription.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting subscription:", error)
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
  }
}
