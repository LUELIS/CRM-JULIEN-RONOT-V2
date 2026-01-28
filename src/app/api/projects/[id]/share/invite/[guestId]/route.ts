import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// DELETE - Remove a guest from the project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { id, guestId } = await params

    // Verify guest belongs to this project
    const guest = await prisma.projectGuest.findFirst({
      where: {
        id: BigInt(guestId),
        projectId: BigInt(id),
      },
    })

    if (!guest) {
      return NextResponse.json({ error: "Invite non trouve" }, { status: 404 })
    }

    await prisma.projectGuest.delete({
      where: { id: BigInt(guestId) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing guest:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
