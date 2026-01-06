import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyInvoicePaid } from "@/lib/notifications"
import { formatCurrency } from "@/lib/utils"

const DEFAULT_TENANT_ID = BigInt(1)

// Get Revolut settings from tenant
async function getRevolutSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    if (!settings.revolutEnabled) return null

    return {
      apiKey: settings.revolutApiKey,
      environment: settings.revolutEnvironment || "sandbox",
    }
  } catch {
    return null
  }
}

// GET: Cron job to check all pending Revolut payments
export async function GET(request: NextRequest) {
  // Verify cron secret (optional, for security)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get Revolut settings
    const settings = await getRevolutSettings()
    if (!settings) {
      return NextResponse.json({
        success: false,
        message: "Revolut n'est pas configuré",
      })
    }

    // Find all invoices with Revolut payment links that are not paid
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: { in: ["sent", "viewed"] },
        payment_link: { contains: "revolut" },
      },
      include: { client: true },
    })

    // Also find invoices with payment method card that have payment_notes containing "Revolut"
    // or invoices recently sent (last 30 days) with no payment_link but paymentMethod = card
    const recentInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: { in: ["sent", "viewed"] },
        paymentMethod: "card",
        sentAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: { client: true },
    })

    // Combine and deduplicate
    const allInvoices = [...pendingInvoices]
    for (const inv of recentInvoices) {
      if (!allInvoices.find(i => i.id === inv.id)) {
        allInvoices.push(inv)
      }
    }

    if (allInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune facture en attente de paiement Revolut",
        checked: 0,
        paid: 0,
      })
    }

    console.log(`[Revolut Cron] Checking ${allInvoices.length} invoices...`)

    const baseUrl = settings.environment === "production"
      ? "https://merchant.revolut.com/api/1.0"
      : "https://sandbox-merchant.revolut.com/api/1.0"

    const results: { invoiceNumber: string; status: string; paid: boolean }[] = []
    let paidCount = 0

    for (const invoice of allInvoices) {
      try {
        // Search for order by merchant_order_ext_ref (invoice number)
        const searchUrl = `${baseUrl}/orders?merchant_order_ext_ref=${encodeURIComponent(invoice.invoiceNumber)}`

        const searchResponse = await fetch(searchUrl, {
          headers: {
            "Authorization": `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json",
            "Revolut-Api-Version": "2024-09-01",
          },
        })

        if (!searchResponse.ok) {
          console.log(`[Revolut Cron] API error for ${invoice.invoiceNumber}:`, searchResponse.status)
          results.push({ invoiceNumber: invoice.invoiceNumber, status: "api_error", paid: false })
          continue
        }

        const orders = await searchResponse.json()

        // Find completed order
        let order = null
        if (Array.isArray(orders) && orders.length > 0) {
          order = orders.find((o: { state: string }) => o.state === "COMPLETED") || orders[0]
        } else if (orders && orders.id) {
          order = orders
        }

        if (!order) {
          results.push({ invoiceNumber: invoice.invoiceNumber, status: "no_order", paid: false })
          continue
        }

        if (order.state === "COMPLETED") {
          // Mark as paid
          const paymentDate = order.completed_at
            ? new Date(order.completed_at)
            : new Date()

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: "paid",
              paymentDate: paymentDate,
              paymentMethod: "card",
              payment_notes: `Paiement Revolut - Order ID: ${order.id}`,
              updatedAt: new Date(),
            },
          })

          console.log(`[Revolut Cron] Invoice ${invoice.invoiceNumber} marked as paid`)

          // Send notification
          try {
            await notifyInvoicePaid(
              invoice.invoiceNumber,
              invoice.client.companyName,
              formatCurrency(Number(invoice.totalTtc)),
              invoice.id.toString()
            )
          } catch (notifError) {
            console.error(`[Revolut Cron] Notification error for ${invoice.invoiceNumber}:`, notifError)
          }

          results.push({ invoiceNumber: invoice.invoiceNumber, status: "paid", paid: true })
          paidCount++
        } else {
          results.push({ invoiceNumber: invoice.invoiceNumber, status: order.state.toLowerCase(), paid: false })
        }
      } catch (error) {
        console.error(`[Revolut Cron] Error checking ${invoice.invoiceNumber}:`, error)
        results.push({ invoiceNumber: invoice.invoiceNumber, status: "error", paid: false })
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return NextResponse.json({
      success: true,
      message: `${paidCount} facture(s) marquée(s) comme payée(s)`,
      checked: allInvoices.length,
      paid: paidCount,
      results,
    })
  } catch (error) {
    console.error("[Revolut Cron] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification des paiements" },
      { status: 500 }
    )
  }
}

// POST: Same as GET (for flexibility)
export async function POST(request: NextRequest) {
  return GET(request)
}
