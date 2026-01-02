import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { docuseal } from "@/lib/docuseal"

// POST - Reset contract to draft (archive existing DocuSeal submission if any)
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

    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
      include: { signers: true },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    // If contract was sent, try to archive it on DocuSeal
    if (contract.docuseal_submission_id && contract.status !== "draft") {
      try {
        await docuseal.archiveSubmission(contract.docuseal_submission_id)
        console.log(`Archived DocuSeal submission ${contract.docuseal_submission_id} for contract ${id}`)
      } catch (error) {
        console.warn("Could not archive submission on DocuSeal:", error)
        // Continue anyway - we'll reset locally
      }
    }

    // Reset contract to draft
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: "draft",
        docuseal_submission_id: null,
        docuseal_slug: null,
        sentAt: null,
        expiresAt: null,
        completedAt: null,
        voidedAt: null,
      },
    })

    // Reset all signers
    await prisma.contractSigner.updateMany({
      where: { contractId: contract.id },
      data: {
        status: "waiting",
        docuseal_submitter_id: null,
        docuseal_slug: null,
        viewedAt: null,
        signedAt: null,
        declinedAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Contrat remis en brouillon",
    })
  } catch (error) {
    console.error("Error resetting contract:", error)
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation" },
      { status: 500 }
    )
  }
}
