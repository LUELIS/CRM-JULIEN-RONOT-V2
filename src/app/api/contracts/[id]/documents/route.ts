import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// GET - List documents for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const documents = await prisma.contractDocument.findMany({
      where: { contractId: BigInt(id) },
      include: {
        fields: {
          include: {
            signer: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id.toString(),
        filename: d.filename,
        originalPath: d.originalPath,
        signedPath: d.signedPath,
        pageCount: d.pageCount,
        sortOrder: d.sortOrder,
        fields: d.fields.map((f) => ({
          id: f.id.toString(),
          fieldType: f.fieldType,
          pages: f.pages,
          position: f.position,
          size: f.size,
          content: f.content,
          horizontalAdjust: f.horizontalAdjust,
          verticalAdjust: f.verticalAdjust,
          signerId: f.signerId?.toString(),
          signerName: f.signer?.name,
        })),
      })),
    })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    )
  }
}

// POST - Upload document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Validate ID
    if (!id || id === "undefined" || !/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "ID de contrat invalide" },
        { status: 400 }
      )
    }

    // Check contract exists and is in draft status
    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
      include: {
        documents: {
          select: { id: true },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Impossible d'ajouter des documents à un contrat envoyé" },
        { status: 400 }
      )
    }

    // Check max 5 documents
    if (contract.documents.length >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 documents par contrat" },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Seuls les fichiers PDF sont acceptés" },
        { status: 400 }
      )
    }

    // Create uploads directory if needed
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "contracts", id)
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${timestamp}-${sanitizedName}`
    const filePath = path.join(uploadsDir, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Get current max sort order
    const maxOrder = await prisma.contractDocument.aggregate({
      where: { contractId: BigInt(id) },
      _max: { sortOrder: true },
    })

    // Create document record
    const document = await prisma.contractDocument.create({
      data: {
        contractId: BigInt(id),
        filename: file.name,
        originalPath: `/uploads/contracts/${id}/${filename}`,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id.toString(),
        filename: document.filename,
        originalPath: document.originalPath,
        sortOrder: document.sortOrder,
      },
    })
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload du document" },
      { status: 500 }
    )
  }
}

// DELETE - Remove document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get("documentId")

    if (!documentId) {
      return NextResponse.json(
        { error: "ID du document requis" },
        { status: 400 }
      )
    }

    // Check contract is in draft status
    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Impossible de supprimer des documents d'un contrat envoyé" },
        { status: 400 }
      )
    }

    await prisma.contractDocument.delete({
      where: {
        id: BigInt(documentId),
        contractId: BigInt(id),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du document" },
      { status: 500 }
    )
  }
}
