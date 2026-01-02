import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - List signers for a contract
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

    const signers = await prisma.contractSigner.findMany({
      where: { contractId: BigInt(id) },
      include: {
        fields: {
          select: {
            id: true,
            fieldType: true,
            pages: true,
            position: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({
      signers: signers.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        email: s.email,
        phone: s.phone,
        signerType: s.signerType,
        status: s.status,
        accessCode: s.accessCode,
        language: s.language,
        sortOrder: s.sortOrder,
        viewedAt: s.viewedAt?.toISOString(),
        signedAt: s.signedAt?.toISOString(),
        declinedAt: s.declinedAt?.toISOString(),
        declineReason: s.declineReason,
        fieldsCount: s.fields.length,
      })),
    })
  } catch (error) {
    console.error("Error fetching signers:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des signataires" },
      { status: 500 }
    )
  }
}

// POST - Add signer
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
        { error: "Impossible d'ajouter des signataires à un contrat envoyé" },
        { status: 400 }
      )
    }

    const { name, email, phone, signerType, accessCode, forceSignatureType, language } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et email requis" },
        { status: 400 }
      )
    }

    // Get current max sort order
    const maxOrder = await prisma.contractSigner.aggregate({
      where: { contractId: BigInt(id) },
      _max: { sortOrder: true },
    })

    const signer = await prisma.contractSigner.create({
      data: {
        contractId: BigInt(id),
        name,
        email,
        phone,
        signerType: signerType || "signer",
        accessCode,
        forceSignatureType,
        language: language || "fr",
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      signer: {
        id: signer.id.toString(),
        name: signer.name,
        email: signer.email,
        signerType: signer.signerType,
        sortOrder: signer.sortOrder,
      },
    })
  } catch (error) {
    console.error("Error adding signer:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du signataire" },
      { status: 500 }
    )
  }
}

// PUT - Update signer
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
    const { signerId, name, email, phone, signerType, accessCode, forceSignatureType, language, sortOrder } = body

    if (!signerId) {
      return NextResponse.json(
        { error: "ID du signataire requis" },
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
        { error: "Impossible de modifier les signataires d'un contrat envoyé" },
        { status: 400 }
      )
    }

    const signer = await prisma.contractSigner.update({
      where: {
        id: BigInt(signerId),
        contractId: BigInt(id),
      },
      data: {
        name,
        email,
        phone,
        signerType,
        accessCode,
        forceSignatureType,
        language,
        sortOrder,
      },
    })

    return NextResponse.json({
      success: true,
      signer: {
        id: signer.id.toString(),
        name: signer.name,
        email: signer.email,
        signerType: signer.signerType,
      },
    })
  } catch (error) {
    console.error("Error updating signer:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du signataire" },
      { status: 500 }
    )
  }
}

// DELETE - Remove signer
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
    const signerId = searchParams.get("signerId")

    if (!signerId) {
      return NextResponse.json(
        { error: "ID du signataire requis" },
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
        { error: "Impossible de supprimer les signataires d'un contrat envoyé" },
        { status: 400 }
      )
    }

    await prisma.contractSigner.delete({
      where: {
        id: BigInt(signerId),
        contractId: BigInt(id),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting signer:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du signataire" },
      { status: 500 }
    )
  }
}
