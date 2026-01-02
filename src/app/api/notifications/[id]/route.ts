import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { isRead } = body

    const notification = await prisma.notification.update({
      where: { id: BigInt(id) },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    })

    return NextResponse.json({
      id: notification.id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString() || null,
      createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.notification.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
