import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { docuseal, DocumentField, SubmitterInput } from "@/lib/docuseal"
import fs from "fs"
import path from "path"

// POST - Send contract for signature via DocuSeal
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

    // Get contract with all related data
    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
      include: {
        documents: {
          include: {
            fields: {
              include: {
                signer: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        signers: {
          include: {
            fields: true,
          },
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

    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Ce contrat a déjà été envoyé" },
        { status: 400 }
      )
    }

    if (contract.documents.length === 0) {
      return NextResponse.json(
        { error: "Ajoutez au moins un document au contrat" },
        { status: 400 }
      )
    }

    if (contract.signers.length === 0) {
      return NextResponse.json(
        { error: "Ajoutez au moins un signataire" },
        { status: 400 }
      )
    }

    // Check that each signer of type "signer" has at least one signature field
    const signersWithoutFields = contract.signers.filter(
      (s) => s.signerType === "signer" && s.fields.length === 0
    )
    if (signersWithoutFields.length > 0) {
      return NextResponse.json(
        {
          error: `Les signataires suivants n'ont pas de champ signature : ${signersWithoutFields.map((s) => s.name).join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Get tenant for branding
    const tenant = await prisma.tenants.findFirst()

    // Build documents array for DocuSeal
    // DocuSeal uses relative coordinates (0-1)
    const PAGE_WIDTH = 595   // A4 width in points
    const PAGE_HEIGHT = 842  // A4 height in points

    const documentsInput = await Promise.all(contract.documents.map(async (doc) => {
      const filePath = path.join(process.cwd(), "public", doc.originalPath)

      if (!fs.existsSync(filePath)) {
        throw new Error(`Document non trouvé: ${doc.filename}`)
      }

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath)
      const base64Content = fileBuffer.toString("base64")

      // Build fields for this document
      const fields: DocumentField[] = []

      for (const field of doc.fields) {
        if (!field.signer) continue

        // Parse position and size from JSON strings
        const positionObj = typeof field.position === 'string' ? JSON.parse(field.position) : field.position
        const sizeObj = typeof field.size === 'string' ? JSON.parse(field.size) : field.size

        // Convert PDF coordinates to DocuSeal relative coordinates (0-1)
        const x = positionObj.x / PAGE_WIDTH
        const y = positionObj.y / PAGE_HEIGHT
        const w = sizeObj.width / PAGE_WIDTH
        const h = sizeObj.height / PAGE_HEIGHT

        // Parse pages (e.g., "1", "1-3", "1,3,5")
        const pageNumbers = parsePages(field.pages)

        // Map field type to DocuSeal type
        const docusealType = mapFieldType(field.fieldType)

        // Create a field area for each page
        const areas = pageNumbers.map(page => ({
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          w: Math.max(0.01, Math.min(1, w)),
          h: Math.max(0.01, Math.min(1, h)),
          page,
        }))

        // Use signer name as role (DocuSeal uses roles to link fields to submitters)
        const role = field.signer.name

        fields.push({
          name: `${field.fieldType}_${field.id}`,
          type: docusealType,
          role,
          required: true,
          areas,
        })

        console.log(`Field: ${field.fieldType} for ${role} at (${x.toFixed(3)}, ${y.toFixed(3)}) size (${w.toFixed(3)}, ${h.toFixed(3)})`)
      }

      return {
        name: doc.filename,
        file: `data:application/pdf;base64,${base64Content}`,
        fields,
      }
    }))

    // Build submitters array for DocuSeal
    // Each signer becomes a submitter with their name as the role
    const submitters: SubmitterInput[] = contract.signers
      .filter(s => s.signerType === "signer")
      .map((signer) => {
        // Custom email message
        const emailSubject = `${tenant?.name || "Document"} - ${contract.title} à signer`
        const emailBody = `Bonjour ${signer.name},

Vous avez reçu un document "${contract.title}" à signer de la part de ${tenant?.name || "notre entreprise"}.

Cliquez sur le lien ci-dessous pour consulter et signer le document :
{{submitter.link}}

Ce document a valeur légale conformément au règlement eIDAS.

Cordialement,
${tenant?.name || "L'équipe"}`

        return {
          role: signer.name, // Role must match field roles
          email: signer.email,
          name: signer.name,
          phone: signer.phone || undefined,
          external_id: signer.id.toString(),
          send_email: true,
          message: {
            subject: emailSubject,
            body: emailBody,
          },
        }
      })

    // Calculate expiration date
    const expireAt = new Date()
    expireAt.setDate(expireAt.getDate() + contract.expirationDays)

    console.log("Creating DocuSeal submission...")
    console.log(`Documents: ${documentsInput.length}`)
    console.log(`Submitters: ${submitters.map(s => s.email).join(", ")}`)

    // Create submission via DocuSeal API
    const submission = await docuseal.createSubmissionFromPDF({
      name: contract.title,
      documents: documentsInput,
      submitters,
      send_email: true,
      order: contract.lockOrder ? "preserved" : "random",
      expire_at: expireAt.toISOString(),
      reply_to: tenant?.email || undefined,
    })

    console.log(`Submission created: ID=${submission.id}, status=${submission.status}`)

    // Update contract with DocuSeal data
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: "sent",
        docuseal_submission_id: submission.id,
        docuseal_slug: submission.slug,
        sentAt: new Date(),
        expiresAt: expireAt,
      },
    })

    // Update signers with their DocuSeal submitter data
    for (const submitter of submission.submitters) {
      // Find the signer by external_id (which we set to signer.id)
      const signer = contract.signers.find((s) => s.id.toString() === submitter.external_id)
      if (signer) {
        await prisma.contractSigner.update({
          where: { id: signer.id },
          data: {
            docuseal_submitter_id: submitter.id,
            docuseal_slug: submitter.slug,
            status: "sent",
          },
        })
        console.log(`Signer ${signer.name}: submitter_id=${submitter.id}, slug=${submitter.slug}`)
      }
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      status: "sent",
      expiresAt: expireAt.toISOString(),
      submitters: submission.submitters.map(s => ({
        email: s.email,
        name: s.name,
        signingUrl: `https://docuseal.eu/s/${s.slug}`,
      })),
    })
  } catch (error) {
    console.error("Error sending contract for signature:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi pour signature",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// Helper function to parse pages string (e.g., "1", "1-3", "1,3,5")
function parsePages(pagesStr: string): number[] {
  const pages: number[] = []
  const parts = pagesStr.split(",")

  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.includes("-")) {
      const [start, end] = trimmed.split("-").map(Number)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    } else {
      pages.push(Number(trimmed))
    }
  }

  return pages
}

// Map our field types to DocuSeal types
function mapFieldType(fieldType: string): DocumentField["type"] {
  const typeMap: Record<string, DocumentField["type"]> = {
    signature: "signature",
    initials: "initials",
    name: "text",
    date: "date",
    text: "text",
    input: "text",
    checkbox: "checkbox",
  }
  return typeMap[fieldType] || "text"
}
