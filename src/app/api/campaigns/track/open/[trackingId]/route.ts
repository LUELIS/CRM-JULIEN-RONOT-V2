import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params

  try {
    // Update recipient as opened (only if not already opened)
    await prisma.emailRecipient.updateMany({
      where: {
        trackingId,
        openedAt: null,
      },
      data: {
        status: "opened",
        openedAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Error tracking open:", error)
  }

  // Return tracking pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
