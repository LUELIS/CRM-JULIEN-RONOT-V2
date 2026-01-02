import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim() || ""

    if (query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Search clients
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { companyName: { contains: query } },
          { email: { contains: query } },
          { first_name: { contains: query } },
          { last_name: { contains: query } },
        ],
      },
      take: 5,
      select: {
        id: true,
        companyName: true,
        email: true,
      },
    })

    // Search invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query } },
          { client: { companyName: { contains: query } } },
        ],
      },
      take: 5,
      include: {
        client: { select: { companyName: true } },
      },
    })

    // Search quotes
    const quotes = await prisma.quote.findMany({
      where: {
        OR: [
          { quoteNumber: { contains: query } },
          { client: { companyName: { contains: query } } },
        ],
      },
      take: 5,
      include: {
        client: { select: { companyName: true } },
      },
    })

    const results = [
      ...clients.map((c) => ({
        type: "client" as const,
        id: c.id.toString(),
        title: c.companyName || "Client sans nom",
        subtitle: c.email || "",
      })),
      ...invoices.map((i) => ({
        type: "invoice" as const,
        id: i.id.toString(),
        title: i.invoiceNumber,
        subtitle: i.client?.companyName || "Client inconnu",
      })),
      ...quotes.map((q) => ({
        type: "quote" as const,
        id: q.id.toString(),
        title: q.quoteNumber,
        subtitle: q.client?.companyName || "Client inconnu",
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Erreur de recherche" }, { status: 500 })
  }
}
