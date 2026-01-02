import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Base URL for DocuSeal signing interface
const SIGNING_BASE_URL = "https://docuseal.eu/s"

// GET - Get signing URLs for all signers of a contract
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

    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
      include: {
        signers: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    if (contract.status === "draft") {
      return NextResponse.json(
        { error: "Le contrat n'a pas encore été envoyé" },
        { status: 400 }
      )
    }

    // Build signing URLs for each signer
    const signingUrls = contract.signers.map((signer) => ({
      id: signer.id.toString(),
      name: signer.name,
      email: signer.email,
      signerType: signer.signerType,
      status: signer.status,
      signingUrl: signer.docuseal_slug
        ? `${SIGNING_BASE_URL}/${signer.docuseal_slug}`
        : null,
      viewedAt: signer.viewedAt?.toISOString(),
      signedAt: signer.signedAt?.toISOString(),
    }))

    return NextResponse.json({
      contractId: contract.id.toString(),
      contractTitle: contract.title,
      contractStatus: contract.status,
      submissionId: contract.docuseal_submission_id,
      expiresAt: contract.expiresAt?.toISOString(),
      signers: signingUrls,
    })
  } catch (error) {
    console.error("Error getting signing URLs:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des URLs de signature" },
      { status: 500 }
    )
  }
}
