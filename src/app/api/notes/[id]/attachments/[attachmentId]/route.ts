import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// DELETE - Delete a specific attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id, attachmentId } = await params
    const noteId = BigInt(id)
    const attId = BigInt(attachmentId)

    // Find the attachment
    const attachment = await prisma.noteAttachment.findFirst({
      where: { id: attId, noteId },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Pièce jointe non trouvée" }, { status: 404 })
    }

    // Delete file from disk
    const filepath = join(process.cwd(), "public", attachment.path)
    if (existsSync(filepath)) {
      try {
        await unlink(filepath)
      } catch (e) {
        console.error("Could not delete file:", e)
      }
    }

    // Delete database record
    await prisma.noteAttachment.delete({ where: { id: attId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la pièce jointe" },
      { status: 500 }
    )
  }
}

// GET - Download/view a specific attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id, attachmentId } = await params
    const noteId = BigInt(id)
    const attId = BigInt(attachmentId)

    const attachment = await prisma.noteAttachment.findFirst({
      where: { id: attId, noteId },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Pièce jointe non trouvée" }, { status: 404 })
    }

    return NextResponse.json({
      id: attachment.id.toString(),
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      path: attachment.path,
      createdAt: attachment.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching attachment:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la pièce jointe" },
      { status: 500 }
    )
  }
}
