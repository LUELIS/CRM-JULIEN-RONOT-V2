import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiToken, apiError, apiSuccess } from "@/app/api/external/support/auth"

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
      case "ticket": {
        const ticket = await prisma.ticket.findUnique({
          where: { id: entityId },
          select: { ticketNumber: true, subject: true },
        })
        return ticket ? `${ticket.ticketNumber} - ${ticket.subject}` : null
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

// GET /api/external/notes - Get notes for widget
// Requires: Bearer token with "notes" or "*" permission
export async function GET(request: NextRequest) {
  const authResult = await validateApiTokenWithNotesPermission(request)
  if (!authResult.valid) {
    return apiError(authResult.error || "Non autorisé", 401)
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || "" // quick, note, todo
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
    const withReminders = searchParams.get("reminders") === "true"
    const pinnedOnly = searchParams.get("pinned") === "true"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenant_id: authResult.tenantId,
      isArchived: false,
      isRecycle: false,
    }

    if (type && type !== "all") {
      where.type = type
    }

    if (withReminders) {
      where.reminderAt = { not: null }
    }

    if (pinnedOnly) {
      where.isTop = true
    }

    const notes = await prisma.note.findMany({
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
      },
      orderBy: [
        { isTop: "desc" },
        { reminderAt: "asc" },
        { createdAt: "desc" },
      ],
      take: limit,
    })

    // Format response
    const formattedNotes = await Promise.all(
      notes.map(async (note) => ({
        id: note.id.toString(),
        content: note.content,
        type: note.type,
        isTop: note.isTop,
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
        entityLinks: await Promise.all(
          note.entityLinks.map(async (l) => ({
            entityType: l.entityType,
            entityId: l.entityId.toString(),
            entityName: await getEntityName(l.entityType, l.entityId),
          }))
        ),
      }))
    )

    // Get stats
    const [quickCount, noteCount, todoCount, remindersCount] = await Promise.all([
      prisma.note.count({ where: { tenant_id: authResult.tenantId, type: "quick", isArchived: false, isRecycle: false } }),
      prisma.note.count({ where: { tenant_id: authResult.tenantId, type: "note", isArchived: false, isRecycle: false } }),
      prisma.note.count({ where: { tenant_id: authResult.tenantId, type: "todo", isArchived: false, isRecycle: false } }),
      prisma.note.count({ where: { tenant_id: authResult.tenantId, reminderAt: { not: null }, isArchived: false, isRecycle: false } }),
    ])

    return apiSuccess({
      notes: formattedNotes,
      stats: {
        quick: quickCount,
        note: noteCount,
        todo: todoCount,
        reminders: remindersCount,
        total: quickCount + noteCount + todoCount,
      },
    })
  } catch (error) {
    console.error("[External Notes API] Error:", error)
    return apiError("Erreur lors de la récupération des notes", 500)
  }
}

// Custom validation that also accepts "notes" permission
async function validateApiTokenWithNotesPermission(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")

  if (!authHeader) {
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Missing Authorization header" }
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Invalid Authorization format. Use: Bearer <token>" }
  }

  const token = authHeader.slice(7)

  if (!token || token.length < 32) {
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Invalid API token" }
  }

  try {
    const crypto = await import("crypto")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const apiKey = await prisma.externalApiKey.findFirst({
      where: {
        tokenHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!apiKey) {
      return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Invalid or expired API token" }
    }

    // Check permissions - accept "notes", "widget", or "*"
    const permissions = apiKey.permissions ? JSON.parse(apiKey.permissions) : []
    if (!permissions.includes("notes") && !permissions.includes("widget") && !permissions.includes("*")) {
      return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "API token does not have notes permissions" }
    }

    // Update last used
    await prisma.externalApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    return {
      valid: true,
      tenantId: apiKey.tenant_id,
      apiKeyId: apiKey.id,
    }
  } catch (error) {
    console.error("[API Auth] Error validating token:", error)
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Authentication error" }
  }
}
