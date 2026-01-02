import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get all clients with recurring services through ClientService
    const clients = await prisma.client.findMany({
      where: {
        tenant_id: BigInt(1),
        status: { in: ["active", "prospect"] },
        services: {
          some: {
            is_active: true,
            service: {
              isRecurring: true,
            },
          },
        },
      },
      include: {
        services: {
          where: {
            is_active: true,
            service: {
              isRecurring: true,
            },
          },
          include: {
            service: {
              include: {
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: { companyName: "asc" },
    })

    // Calculate MRR for each client
    let totalMRR_HT = 0
    let totalMRR_TTC = 0

    const clientsWithMRR = clients.map((client) => {
      let clientMRR_HT = 0
      let clientMRR_TTC = 0

      const servicesWithCalc = client.services.map((cs) => {
        // Use custom price if set, otherwise service price
        const priceHT = cs.custom_price_ht
          ? Number(cs.custom_price_ht)
          : Number(cs.service.unitPriceHt)
        const vatRate = Number(cs.service.vatRate)
        const quantity = Number(cs.quantity)
        const linePriceHT = priceHT * quantity
        const priceTTC = linePriceHT * (1 + vatRate / 100)

        clientMRR_HT += linePriceHT
        clientMRR_TTC += priceTTC

        return {
          id: cs.id.toString(),
          code: cs.service.code,
          name: cs.service.name,
          priceHT: linePriceHT,
          vatRate,
          priceTTC,
          quantity,
          unit: cs.service.unit,
          category: cs.service.category
            ? {
                id: cs.service.category.id.toString(),
                name: cs.service.category.name,
                color: cs.service.category.color,
              }
            : null,
        }
      })

      totalMRR_HT += clientMRR_HT
      totalMRR_TTC += clientMRR_TTC

      return {
        id: client.id.toString(),
        companyName: client.companyName,
        email: client.email,
        status: client.status,
        invoiceCount: client._count.invoices,
        services: servicesWithCalc,
        mrr_ht: clientMRR_HT,
        mrr_ttc: clientMRR_TTC,
      }
    })

    return NextResponse.json({
      clients: clientsWithMRR,
      totals: {
        mrr_ht: totalMRR_HT,
        mrr_ttc: totalMRR_TTC,
        clientCount: clients.length,
        serviceCount: clients.reduce((sum, c) => sum + c.services.length, 0),
      },
    })
  } catch (error) {
    console.error("Error fetching recurring data:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "generateInvoices") {
      return await generateRecurringInvoices(body.clientIds)
    }

    return NextResponse.json(
      { error: "Action non reconnue" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error processing recurring action:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement" },
      { status: 500 }
    )
  }
}

async function generateRecurringInvoices(clientIds?: string[]) {
  const monthName = new Date().toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })

  console.log("=== GENERATING RECURRING INVOICES ===")
  console.log("ClientIds received:", clientIds)

  // Build where clause
  const whereClause: Record<string, unknown> = {
    tenant_id: BigInt(1),
    status: { in: ["active", "prospect"] },
    services: {
      some: {
        is_active: true,
        service: {
          isRecurring: true,
        },
      },
    },
  }

  if (clientIds && clientIds.length > 0) {
    whereClause.id = {
      in: clientIds.map((id) => BigInt(id)),
    }
  }

  console.log("Where clause:", JSON.stringify(whereClause, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2))

  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      services: {
        where: {
          is_active: true,
          service: {
            isRecurring: true,
          },
        },
        include: {
          service: true,
        },
      },
    },
  })

  console.log("Clients found:", clients.length)
  clients.forEach(c => {
    console.log(`- ${c.companyName} (ID: ${c.id}, status: ${c.status}, services: ${c.services.length})`)
  })

  let generatedCount = 0
  const errors: string[] = []

  for (const client of clients) {
    try {
      if (client.services.length === 0) continue

      // Calculate totals
      let subtotalHT = 0
      let taxAmount = 0

      const items = client.services.map((cs) => {
        const priceHT = cs.custom_price_ht
          ? Number(cs.custom_price_ht)
          : Number(cs.service.unitPriceHt)
        const quantity = Number(cs.quantity)
        const vatRate = Number(cs.service.vatRate)
        const lineTotal = priceHT * quantity
        const lineTax = lineTotal * (vatRate / 100)

        subtotalHT += lineTotal
        taxAmount += lineTax

        return {
          clientService: cs,
          priceHT,
          quantity,
          vatRate,
          lineTotal,
          lineTax,
        }
      })

      const totalTTC = subtotalHT + taxAmount

      // Generate invoice number (same logic as main invoice creation)
      const lastInvoice = await prisma.invoice.findFirst({
        where: { tenant_id: BigInt(1) },
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
          tenant_id: BigInt(1),
          clientId: client.id,
          invoiceNumber,
          invoice_type: "standard",
          status: "draft",
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotalHt: subtotalHT,
          taxAmount: taxAmount,
          totalTtc: totalTTC,
          notes: `Facturation des services récurrents - ${monthName}`,
        },
      })

      // Create invoice items
      for (const item of items) {
        await prisma.invoiceItem.create({
          data: {
            tenant_id: BigInt(1),
            invoiceId: invoice.id,
            serviceId: item.clientService.service.id,
            description: item.clientService.service.name,
            quantity: item.quantity,
            unit: item.clientService.service.unit || "mois",
            unitPriceHt: item.priceHT,
            vatRate: item.vatRate,
            taxAmount: item.lineTax,
            totalHt: item.lineTotal,
            totalTtc: item.lineTotal + item.lineTax,
          },
        })
      }

      generatedCount++
    } catch (err) {
      errors.push(`${client.companyName}: ${err instanceof Error ? err.message : "Erreur"}`)
    }
  }

  return NextResponse.json({
    success: true,
    generatedCount,
    errors,
    message: `${generatedCount} facture(s) générée(s) en brouillon`,
  })
}
