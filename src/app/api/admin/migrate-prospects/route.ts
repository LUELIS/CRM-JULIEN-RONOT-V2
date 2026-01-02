import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// One-time migration: convert prospects with accepted quotes or invoices to active clients
export async function POST() {
  try {
    // Find all prospects with accepted quotes or invoices
    const prospects = await prisma.client.findMany({
      where: {
        status: "prospect",
        OR: [
          { quotes: { some: { status: "accepted" } } },
          { invoices: { some: {} } }
        ]
      },
      select: {
        id: true,
        companyName: true,
        _count: {
          select: {
            quotes: { where: { status: "accepted" } },
            invoices: true
          }
        }
      }
    })

    const converted: string[] = []

    for (const client of prospects) {
      await prisma.client.update({
        where: { id: client.id },
        data: { status: "active" }
      })
      converted.push(`${client.companyName} (${client._count.quotes} devis acceptés, ${client._count.invoices} factures)`)
    }

    return NextResponse.json({
      success: true,
      count: converted.length,
      converted
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la migration", details: String(error) },
      { status: 500 }
    )
  }
}
