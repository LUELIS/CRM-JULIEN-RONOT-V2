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

    // Search in parallel for better performance
    const [clients, invoices, quotes, notes, tickets, contracts, domains, subscriptions, services] = await Promise.all([
      // Search clients
      prisma.client.findMany({
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
      }),

      // Search invoices
      prisma.invoice.findMany({
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
      }),

      // Search quotes
      prisma.quote.findMany({
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
      }),

      // Search notes (content only, no title field)
      prisma.note.findMany({
        where: {
          content: { contains: query },
        },
        take: 5,
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      }),

      // Search tickets
      prisma.ticket.findMany({
        where: {
          OR: [
            { subject: { contains: query } },
            { ticketNumber: { contains: query } },
            { client: { companyName: { contains: query } } },
          ],
        },
        take: 5,
        include: {
          client: { select: { companyName: true } },
        },
      }),

      // Search contracts
      prisma.contract.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: 5,
        include: {
          client: { select: { companyName: true } },
        },
      }),

      // Search domains (field is "domain" not "domainName")
      prisma.domain.findMany({
        where: {
          domain: { contains: query },
        },
        take: 5,
        include: {
          client: { select: { companyName: true } },
        },
      }),

      // Search subscriptions
      prisma.subscription.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { client: { companyName: { contains: query } } },
          ],
        },
        take: 5,
        include: {
          client: { select: { companyName: true } },
        },
      }),

      // Search services (unitPriceHt, not price)
      prisma.service.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          unitPriceHt: true,
        },
      }),
    ])

    // Helper to extract title from note content
    const getNoteTitle = (content: string) => {
      // Remove HTML tags and get first line or first 50 chars
      const text = content.replace(/<[^>]*>/g, "").trim()
      const firstLine = text.split("\n")[0]
      return firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine || "Note sans titre"
    }

    const results = [
      ...clients.map((c) => ({
        type: "client" as const,
        id: c.id.toString(),
        title: c.companyName || "Client sans nom",
        subtitle: c.email || "",
        icon: "building",
      })),
      ...invoices.map((i) => ({
        type: "invoice" as const,
        id: i.id.toString(),
        title: i.invoiceNumber,
        subtitle: i.client?.companyName || "Client inconnu",
        icon: "file-text",
      })),
      ...quotes.map((q) => ({
        type: "quote" as const,
        id: q.id.toString(),
        title: q.quoteNumber,
        subtitle: q.client?.companyName || "Client inconnu",
        icon: "file",
      })),
      ...notes.map((n) => ({
        type: "note" as const,
        id: n.id.toString(),
        title: getNoteTitle(n.content),
        subtitle: n.createdAt ? new Date(n.createdAt).toLocaleDateString("fr-FR") : "",
        icon: "sticky-note",
      })),
      ...tickets.map((t) => ({
        type: "ticket" as const,
        id: t.id.toString(),
        title: `${t.ticketNumber} - ${t.subject}`,
        subtitle: t.client?.companyName || "Sans client",
        icon: "headphones",
      })),
      ...contracts.map((c) => ({
        type: "contract" as const,
        id: c.id.toString(),
        title: c.title || "Contrat",
        subtitle: c.client?.companyName || "Client inconnu",
        icon: "file-signature",
      })),
      ...domains.map((d) => ({
        type: "domain" as const,
        id: d.id.toString(),
        title: d.domain,
        subtitle: d.client?.companyName || "Sans client",
        icon: "globe",
      })),
      ...subscriptions.map((s) => ({
        type: "subscription" as const,
        id: s.id.toString(),
        title: s.name,
        subtitle: s.client?.companyName || "Client inconnu",
        icon: "refresh-cw",
      })),
      ...services.map((s) => ({
        type: "service" as const,
        id: s.id.toString(),
        title: s.name,
        subtitle: s.unitPriceHt ? `${Number(s.unitPriceHt).toFixed(2)} € HT` : "",
        icon: "package",
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Erreur de recherche" }, { status: 500 })
  }
}
