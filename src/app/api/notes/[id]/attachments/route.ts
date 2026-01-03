import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { randomUUID } from "crypto"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "notes")

// GET - List attachments for a note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const noteId = BigInt(id)

    const attachments = await prisma.noteAttachment.findMany({
      where: { noteId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      attachments: attachments.map((a) => ({
        id: a.id.toString(),
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        path: a.path,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des pièces jointes" },
      { status: 500 }
    )
  }
}

// POST - Upload attachment(s) to a note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const noteId = BigInt(id)

    // Verify note exists
    const note = await prisma.note.findUnique({ where: { id: noteId } })
    if (!note) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const uploadedAttachments = []

    for (const file of files) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        continue // Skip files that are too large
      }

      // Generate unique filename
      const ext = file.name.split(".").pop() || ""
      const filename = `${randomUUID()}.${ext}`
      const filepath = join(UPLOAD_DIR, filename)

      // Save file to disk
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      // Create database record
      const attachment = await prisma.noteAttachment.create({
        data: {
          noteId,
          filename,
          originalName: file.name,
          mimeType: file.type || null,
          size: file.size,
          path: `/uploads/notes/${filename}`,
        },
      })

      uploadedAttachments.push({
        id: attachment.id.toString(),
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        path: attachment.path,
        createdAt: attachment.createdAt.toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      attachments: uploadedAttachments,
      uploadedCount: uploadedAttachments.length,
      skippedCount: files.length - uploadedAttachments.length,
    })
  } catch (error) {
    console.error("Error uploading attachments:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload des pièces jointes" },
      { status: 500 }
    )
  }
}

// DELETE - Delete all attachments for a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const noteId = BigInt(id)

    // Delete all attachments for the note
    await prisma.noteAttachment.deleteMany({ where: { noteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachments:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression des pièces jointes" },
      { status: 500 }
    )
  }
}
