import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get single contract
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
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
            postalCode: true,
            city: true,
            contactFirstname: true,
            contactLastname: true,
            contactEmail: true,
          },
        },
        documents: {
          include: {
            fields: {
              include: {
                signer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
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

    return NextResponse.json({
      contract: {
        id: contract.id.toString(),
        title: contract.title,
        description: contract.description,
        content: contract.content,
        status: contract.status,
        clientId: contract.client.id.toString(),
        clientName: contract.client.companyName,
        expirationDays: contract.expirationDays,
        lockOrder: contract.lockOrder,
        signerReminders: contract.signerReminders,
        docuseal_submission_id: contract.docuseal_submission_id,
        docuseal_combined_document_url: contract.docuseal_combined_document_url,
        docuseal_audit_log_url: contract.docuseal_audit_log_url,
        sentAt: contract.sentAt?.toISOString(),
        completedAt: contract.completedAt?.toISOString(),
        voidedAt: contract.voidedAt?.toISOString(),
        expiresAt: contract.expiresAt?.toISOString(),
        createdAt: contract.createdAt?.toISOString(),
        client: {
          id: contract.client.id.toString(),
          companyName: contract.client.companyName,
          email: contract.client.email,
          phone: contract.client.phone,
          address: contract.client.address,
          postalCode: contract.client.postalCode,
          city: contract.client.city,
          contactFirstname: contract.client.contactFirstname,
          contactLastname: contract.client.contactLastname,
          contactEmail: contract.client.contactEmail,
        },
        documents: contract.documents.map((d) => ({
          id: d.id.toString(),
          filename: d.filename,
          originalPath: d.originalPath,
          signedPath: d.signedPath,
          pageCount: d.pageCount,
          sortOrder: d.sortOrder,
          fields: d.fields.map((f) => ({
            id: f.id.toString(),
            documentId: d.id.toString(),
            signerId: f.signer?.id.toString() || null,
            signerName: f.signer?.name || null,
            fieldType: f.fieldType,
            pages: f.pages,
            position: f.position,
            size: f.size,
            content: f.content,
            horizontalAdjust: f.horizontalAdjust,
            verticalAdjust: f.verticalAdjust,
          })),
        })),
        signers: contract.signers.map((s) => ({
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
          docuseal_submitter_id: s.docuseal_submitter_id,
          docuseal_slug: s.docuseal_slug,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching contract:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du contrat" },
      { status: 500 }
    )
  }
}

// PUT - Update contract
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

    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    // Only allow updates if contract is in draft status
    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Seuls les contrats en brouillon peuvent être modifiés" },
        { status: 400 }
      )
    }

    const { title, description, content, expirationDays, lockOrder, signerReminders } = body

    const updated = await prisma.contract.update({
      where: { id: BigInt(id) },
      data: {
        title: title !== undefined ? title : contract.title,
        description: description !== undefined ? description : contract.description,
        content: content !== undefined ? content : contract.content,
        expirationDays: expirationDays !== undefined ? expirationDays : contract.expirationDays,
        lockOrder: lockOrder !== undefined ? lockOrder : contract.lockOrder,
        signerReminders: signerReminders !== undefined ? signerReminders : contract.signerReminders,
      },
    })

    return NextResponse.json({
      success: true,
      contract: {
        id: updated.id.toString(),
        title: updated.title,
        status: updated.status,
      },
    })
  } catch (error) {
    console.error("Error updating contract:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du contrat" },
      { status: 500 }
    )
  }
}

// DELETE - Delete contract
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

    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    // Only allow deletion if contract is in draft status
    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Seuls les contrats en brouillon peuvent être supprimés" },
        { status: 400 }
      )
    }

    await prisma.contract.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting contract:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du contrat" },
      { status: 500 }
    )
  }
}
