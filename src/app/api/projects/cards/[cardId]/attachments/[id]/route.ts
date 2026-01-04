import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { deleteFile } from "@/lib/file-upload"

// DELETE: Delete an attachment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cardId: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    // Get attachment to delete the file
    const attachment = await prisma.projectCardAttachment.findUnique({
      where: { id: BigInt(id) },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Piece jointe non trouvee" }, { status: 404 })
    }

    // Delete file from disk
    await deleteFile(attachment.filePath)

    // Delete from database
    await prisma.projectCardAttachment.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
