import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { docuseal } from "@/lib/docuseal"

// POST - Sync contract status from DocuSeal
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
      include: {
        signers: true,
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contrat non trouvé" }, { status: 404 })
    }

    if (!contract.docuseal_submission_id) {
      return NextResponse.json(
        { error: "Ce contrat n'a pas été envoyé via DocuSeal" },
        { status: 400 }
      )
    }

    // Fetch submission from DocuSeal
    const submission = await docuseal.getSubmission(contract.docuseal_submission_id)

    // Update contract status based on submission
    let newStatus = contract.status
    let completedAt = contract.completedAt

    if (submission.status === "completed") {
      newStatus = "completed"
      completedAt = submission.completed_at ? new Date(submission.completed_at) : new Date()
    } else if (submission.status === "expired") {
      newStatus = "expired"
    } else if (submission.status === "archived") {
      newStatus = "voided"
    } else {
      // Check if any signer has viewed/signed
      const hasDeclined = submission.submitters.some(s => s.declined_at)
      const hasSigned = submission.submitters.some(s => s.completed_at)
      const hasViewed = submission.submitters.some(s => s.opened_at)

      if (hasDeclined) {
        newStatus = "declined"
      } else if (hasSigned) {
        newStatus = "partially_signed"
      } else if (hasViewed) {
        newStatus = "viewed"
      } else {
        newStatus = "sent"
      }
    }

    // Update contract
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: newStatus,
        completedAt,
        docuseal_combined_document_url: submission.combined_document_url,
        docuseal_audit_log_url: submission.audit_log_url,
      },
    })

    // Update each signer
    for (const submitter of submission.submitters) {
      // Find signer by docuseal_submitter_id or by matching email
      const signer = contract.signers.find(
        s => s.docuseal_submitter_id === submitter.id || s.email === submitter.email
      )

      if (signer) {
        let signerStatus = signer.status

        if (submitter.declined_at) {
          signerStatus = "declined"
        } else if (submitter.completed_at) {
          signerStatus = "signed"
        } else if (submitter.opened_at) {
          signerStatus = "viewed"
        } else if (submitter.sent_at) {
          signerStatus = "sent"
        }

        await prisma.contractSigner.update({
          where: { id: signer.id },
          data: {
            status: signerStatus,
            viewedAt: submitter.opened_at ? new Date(submitter.opened_at) : signer.viewedAt,
            signedAt: submitter.completed_at ? new Date(submitter.completed_at) : signer.signedAt,
            declinedAt: submitter.declined_at ? new Date(submitter.declined_at) : signer.declinedAt,
            docuseal_submitter_id: submitter.id,
            docuseal_slug: submitter.slug,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      submission: {
        id: submission.id,
        status: submission.status,
        combined_document_url: submission.combined_document_url,
        audit_log_url: submission.audit_log_url,
        submitters: submission.submitters.map(s => ({
          email: s.email,
          name: s.name,
          status: s.status,
          signed_at: s.completed_at,
          viewed_at: s.opened_at,
          signing_url: `https://docuseal.eu/s/${s.slug}`,
        })),
      },
    })
  } catch (error) {
    console.error("Error syncing contract:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la synchronisation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
