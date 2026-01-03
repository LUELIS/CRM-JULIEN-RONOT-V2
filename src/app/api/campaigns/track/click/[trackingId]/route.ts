import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params
  const url = request.nextUrl.searchParams.get("url")

  try {
    // Update recipient as clicked
    await prisma.emailRecipient.updateMany({
      where: {
        trackingId,
        clickedAt: null,
      },
      data: {
        status: "clicked",
        clickedAt: new Date(),
        // Also mark as opened if not already
        openedAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Error tracking click:", error)
  }

  // Redirect to original URL
  if (url) {
    return NextResponse.redirect(decodeURIComponent(url))
  }

  // Fallback
  return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || "/")
}
