import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - List fields for a contract
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

    const fields = await prisma.contractField.findMany({
      where: {
        document: { contractId: BigInt(id) },
      },
      include: {
        document: {
          select: { id: true, filename: true },
        },
        signer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      fields: fields.map((f) => ({
        id: f.id.toString(),
        documentId: f.documentId.toString(),
        documentFilename: f.document.filename,
        signerId: f.signerId?.toString(),
        signerName: f.signer?.name,
        fieldType: f.fieldType,
        pages: f.pages,
        position: f.position,
        size: f.size,
        content: f.content,
        horizontalAdjust: f.horizontalAdjust,
        verticalAdjust: f.verticalAdjust,
      })),
    })
  } catch (error) {
    console.error("Error fetching fields:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des champs" },
      { status: 500 }
    )
  }
}

// POST - Add field to document
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
    const body = await request.json()

    // Check contract exists and is in draft status
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
        { error: "Impossible d'ajouter des champs à un contrat envoyé" },
        { status: 400 }
      )
    }

    const {
      documentId,
      signerId,
      fieldType,
      pages,
      position,
      size,
      content,
      horizontalAdjust,
      verticalAdjust,
    } = body

    if (!documentId || !fieldType || !pages || !position || !size) {
      return NextResponse.json(
        { error: "documentId, fieldType, pages, position et size requis" },
        { status: 400 }
      )
    }

    // Verify document belongs to this contract
    const document = await prisma.contractDocument.findFirst({
      where: {
        id: BigInt(documentId),
        contractId: BigInt(id),
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé dans ce contrat" },
        { status: 404 }
      )
    }

    // If signerId provided, verify signer belongs to this contract
    if (signerId) {
      const signer = await prisma.contractSigner.findFirst({
        where: {
          id: BigInt(signerId),
          contractId: BigInt(id),
        },
      })

      if (!signer) {
        return NextResponse.json(
          { error: "Signataire non trouvé dans ce contrat" },
          { status: 404 }
        )
      }
    }

    const field = await prisma.contractField.create({
      data: {
        documentId: BigInt(documentId),
        signerId: signerId ? BigInt(signerId) : null,
        fieldType,
        pages,
        position,
        size,
        content: content || null,
        horizontalAdjust: horizontalAdjust ?? 0,
        verticalAdjust: verticalAdjust ?? 0,
        createdAt: new Date(),
      },
      include: {
        signer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      field: {
        id: field.id.toString(),
        documentId: field.documentId.toString(),
        signerId: field.signerId?.toString(),
        signerName: field.signer?.name,
        fieldType: field.fieldType,
        pages: field.pages,
        position: field.position,
        size: field.size,
      },
    })
  } catch (error) {
    console.error("Error adding field:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du champ" },
      { status: 500 }
    )
  }
}

// PUT - Update field
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      fieldId,
      signerId,
      fieldType,
      pages,
      position,
      size,
      content,
      horizontalAdjust,
      verticalAdjust,
    } = body

    if (!fieldId) {
      return NextResponse.json(
        { error: "ID du champ requis" },
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
        { error: "Impossible de modifier les champs d'un contrat envoyé" },
        { status: 400 }
      )
    }

    // Verify field belongs to this contract
    const existingField = await prisma.contractField.findFirst({
      where: {
        id: BigInt(fieldId),
        document: { contractId: BigInt(id) },
      },
    })

    if (!existingField) {
      return NextResponse.json(
        { error: "Champ non trouvé dans ce contrat" },
        { status: 404 }
      )
    }

    // Build update data - only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {}

    // Only update signerId if explicitly provided (not undefined)
    if (signerId !== undefined) {
      updateData.signerId = signerId ? BigInt(signerId) : null
    }
    if (fieldType !== undefined) updateData.fieldType = fieldType
    if (pages !== undefined) updateData.pages = pages
    if (position !== undefined) updateData.position = position
    if (size !== undefined) updateData.size = size
    if (content !== undefined) updateData.content = content
    if (horizontalAdjust !== undefined) updateData.horizontalAdjust = horizontalAdjust
    if (verticalAdjust !== undefined) updateData.verticalAdjust = verticalAdjust

    const field = await prisma.contractField.update({
      where: { id: BigInt(fieldId) },
      data: updateData,
      include: {
        signer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      field: {
        id: field.id.toString(),
        documentId: field.documentId.toString(),
        signerId: field.signerId?.toString(),
        signerName: field.signer?.name,
        fieldType: field.fieldType,
        pages: field.pages,
        position: field.position,
        size: field.size,
      },
    })
  } catch (error) {
    console.error("Error updating field:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du champ" },
      { status: 500 }
    )
  }
}

// DELETE - Remove field
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
    const fieldId = searchParams.get("fieldId")

    if (!fieldId) {
      return NextResponse.json(
        { error: "ID du champ requis" },
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
        { error: "Impossible de supprimer les champs d'un contrat envoyé" },
        { status: 400 }
      )
    }

    // Verify field belongs to this contract
    const existingField = await prisma.contractField.findFirst({
      where: {
        id: BigInt(fieldId),
        document: { contractId: BigInt(id) },
      },
    })

    if (!existingField) {
      return NextResponse.json(
        { error: "Champ non trouvé dans ce contrat" },
        { status: 404 }
      )
    }

    await prisma.contractField.delete({
      where: { id: BigInt(fieldId) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting field:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du champ" },
      { status: 500 }
    )
  }
}
