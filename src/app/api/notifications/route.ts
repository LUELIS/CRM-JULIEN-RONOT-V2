import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "10")
  const unreadOnly = searchParams.get("unread") === "true"

  try {
    const where: Record<string, unknown> = {
      tenant_id: BigInt(1),
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          tenant_id: BigInt(1),
          isRead: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() || null,
        entityType: n.entityType,
        entityId: n.entityId?.toString() || null,
        createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
      })),
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Mark all as read
    if (action === "markAllRead") {
      await prisma.notification.updateMany({
        where: {
          tenant_id: BigInt(1),
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    // Create new notification
    const { type, title, message, link, entityType, entityId, userId } = body

    const notification = await prisma.notification.create({
      data: {
        tenant_id: BigInt(1),
        userId: userId ? BigInt(userId) : null,
        type,
        title,
        message,
        link,
        entityType,
        entityId: entityId ? BigInt(entityId) : null,
      },
    })

    return NextResponse.json({
      id: notification.id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.isRead,
      createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}
