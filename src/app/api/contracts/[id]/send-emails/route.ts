import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { docuseal } from "@/lib/docuseal"

// POST - Resend signature emails to signers via DocuSeal
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
    const { signerIds } = body // Optional: specific signers to email

    // Get contract with signers
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
        { error: "Le contrat n'a pas encore été envoyé pour signature" },
        { status: 400 }
      )
    }

    // Filter signers to send emails to
    let signersToEmail = contract.signers.filter(
      (s) => s.signerType === "signer" && s.docuseal_submitter_id && s.status !== "signed"
    )

    if (signerIds && signerIds.length > 0) {
      signersToEmail = signersToEmail.filter((s) =>
        signerIds.includes(s.id.toString())
      )
    }

    if (signersToEmail.length === 0) {
      return NextResponse.json(
        { error: "Aucun signataire éligible trouvé" },
        { status: 400 }
      )
    }

    // Resend emails via DocuSeal by updating submitters with send_email: true
    const results = []
    for (const signer of signersToEmail) {
      try {
        // Update submitter to trigger email resend
        await docuseal.updateSubmitter(signer.docuseal_submitter_id!, {
          send_email: true,
        })

        results.push({
          signerId: signer.id.toString(),
          email: signer.email,
          name: signer.name,
          success: true,
        })
      } catch (error) {
        console.error(`Error resending email to ${signer.email}:`, error)
        results.push({
          signerId: signer.id.toString(),
          email: signer.email,
          name: signer.name,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} email(s) renvoyé(s)${failCount > 0 ? `, ${failCount} erreur(s)` : ""}`,
      results,
    })
  } catch (error) {
    console.error("Error sending signature emails:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des emails" },
      { status: 500 }
    )
  }
}
