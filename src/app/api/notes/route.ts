import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Helper to fetch entity names
async function getEntityName(entityType: string, entityId: bigint): Promise<string | null> {
  try {
    switch (entityType) {
      case "client": {
        const client = await prisma.client.findUnique({
          where: { id: entityId },
          select: { companyName: true, first_name: true, last_name: true },
        })
        return client?.companyName || `${client?.first_name || ""} ${client?.last_name || ""}`.trim() || null
      }
      case "invoice": {
        const invoice = await prisma.invoice.findUnique({
          where: { id: entityId },
          select: { invoiceNumber: true },
        })
        return invoice?.invoiceNumber || null
      }
      case "quote": {
        const quote = await prisma.quote.findUnique({
          where: { id: entityId },
          select: { quoteNumber: true },
        })
        return quote?.quoteNumber || null
      }
      case "subscription": {
        const sub = await prisma.subscription.findUnique({
          where: { id: entityId },
          select: { name: true },
        })
        return sub?.name || null
      }
      case "domain": {
        const domain = await prisma.domain.findUnique({
          where: { id: entityId },
          select: { domain: true },
        })
        return domain?.domain || null
      }
      case "ticket": {
        const ticket = await prisma.ticket.findUnique({
          where: { id: entityId },
          select: { ticketNumber: true, subject: true },
        })
        return ticket ? `${ticket.ticketNumber} - ${ticket.subject}` : null
      }
      case "contract": {
        const contract = await prisma.contract.findUnique({
          where: { id: entityId },
          select: { title: true },
        })
        return contract?.title || null
      }
      case "project": {
        const project = await prisma.project.findUnique({
          where: { id: entityId },
          select: { name: true },
        })
        return project?.name || null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

// Helper to enrich entity links with names
async function enrichEntityLinks(links: { id: bigint; entityType: string; entityId: bigint }[]) {
  return Promise.all(
    links.map(async (l) => ({
      id: l.id.toString(),
      entityType: l.entityType,
      entityId: l.entityId.toString(),
      entityName: await getEntityName(l.entityType, l.entityId),
    }))
  )
}

// GET - List notes with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""
    const tagId = searchParams.get("tagId") || ""
    const entityType = searchParams.get("entityType") || ""
    const entityId = searchParams.get("entityId") || ""
    const archived = searchParams.get("archived") === "true"
    const recycled = searchParams.get("recycled") === "true"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const tenantId = BigInt(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenant_id: tenantId,
      isArchived: archived,
      isRecycle: recycled,
    }

    if (search) {
      where.content = { contains: search }
    }

    if (type && type !== "all") {
      where.type = type
    }

    if (tagId) {
      where.tags = {
        some: { tagId: BigInt(tagId) },
      }
    }

    if (entityType && entityId) {
      where.entityLinks = {
        some: {
          entityType,
          entityId: BigInt(entityId),
        },
      }
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          entityLinks: true,
          attachments: {
            select: { id: true, filename: true, mimeType: true },
          },
          comments: {
            select: { id: true },
          },
        },
        orderBy: [
          { isTop: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({ where }),
    ])

    // Get stats
    const [quickCount, noteCount, todoCount, archivedCount] = await Promise.all([
      prisma.note.count({ where: { tenant_id: tenantId, type: "quick", isArchived: false, isRecycle: false } }),
      prisma.note.count({ where: { tenant_id: tenantId, type: "note", isArchived: false, isRecycle: false } }),
      prisma.note.count({ where: { tenant_id: tenantId, type: "todo", isArchived: false, isRecycle: false } }),
      prisma.note.count({ where: { tenant_id: tenantId, isArchived: true, isRecycle: false } }),
    ])

    // Enrich notes with entity names
    const enrichedNotes = await Promise.all(
      notes.map(async (note) => ({
        id: note.id.toString(),
        content: note.content,
        type: note.type,
        isTop: note.isTop,
        isArchived: note.isArchived,
        isShare: note.isShare,
        shareToken: note.shareToken,
        reminderAt: note.reminderAt?.toISOString() || null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        author: {
          id: note.author.id.toString(),
          name: note.author.name,
        },
        tags: note.tags.map((t) => ({
          id: t.tag.id.toString(),
          name: t.tag.name,
          color: t.tag.color,
          icon: t.tag.icon,
        })),
        entityLinks: await enrichEntityLinks(note.entityLinks),
        attachmentCount: note.attachments.length,
        commentCount: note.comments.length,
      }))
    )

    return NextResponse.json({
      notes: enrichedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        quick: quickCount,
        note: noteCount,
        todo: todoCount,
        archived: archivedCount,
        total: quickCount + noteCount + todoCount,
      },
    })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notes" },
      { status: 500 }
    )
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const tenantId = BigInt(1)
    const userId = BigInt(session.user.id)

    // Create the note
    const note = await prisma.note.create({
      data: {
        tenant_id: tenantId,
        createdBy: userId,
        content: body.content || "",
        type: body.type || "note",
        isTop: body.isTop || false,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    })

    // Create entity links if provided
    if (body.entityLinks && body.entityLinks.length > 0) {
      await prisma.noteEntityLink.createMany({
        data: body.entityLinks.map((link: { entityType: string; entityId: string }) => ({
          noteId: note.id,
          entityType: link.entityType,
          entityId: BigInt(link.entityId),
        })),
      })
    }

    // Create tags if provided
    if (body.tagIds && body.tagIds.length > 0) {
      await prisma.noteTag.createMany({
        data: body.tagIds.map((tagId: string) => ({
          noteId: note.id,
          tagId: BigInt(tagId),
        })),
      })
    }

    // Fetch the complete note with relations
    const completeNote = await prisma.note.findUnique({
      where: { id: note.id },
      include: {
        author: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        entityLinks: true,
        attachments: true,
      },
    })

    return NextResponse.json({
      id: completeNote!.id.toString(),
      content: completeNote!.content,
      type: completeNote!.type,
      isTop: completeNote!.isTop,
      isArchived: completeNote!.isArchived,
      isShare: completeNote!.isShare,
      reminderAt: completeNote!.reminderAt?.toISOString() || null,
      createdAt: completeNote!.createdAt.toISOString(),
      updatedAt: completeNote!.updatedAt.toISOString(),
      author: {
        id: completeNote!.author.id.toString(),
        name: completeNote!.author.name,
      },
      tags: completeNote!.tags.map((t) => ({
        id: t.tag.id.toString(),
        name: t.tag.name,
        color: t.tag.color,
        icon: t.tag.icon,
      })),
      entityLinks: await enrichEntityLinks(completeNote!.entityLinks),
      attachmentCount: completeNote!.attachments.length,
      commentCount: 0,
    })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la note" },
      { status: 500 }
    )
  }
}
