import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Count open tickets (status: new, open, pending)
    const openCount = await prisma.ticket.count({
      where: {
        status: {
          in: ["new", "open", "pending"],
        },
      },
    })

    return NextResponse.json({ openCount })
  } catch (error) {
    console.error("Error counting tickets:", error)
    return NextResponse.json({ openCount: 0 })
  }
}
