/**
 * QR Code Redirect Route
 * Handles redirection for QR codes and tracks clicks
 * URL: /link/{id}
 *
 * This route must remain compatible with existing QR codes
 * that point to tools.westarter.fr/link/{id}
 */

import { NextRequest, NextResponse } from "next/server"
import { getQRCodeById, recordClick } from "@/lib/qrcode-db"

// Get location from IP using ip-api.com
async function getLocationFromIP(ip: string): Promise<string> {
  try {
    // Skip for localhost/private IPs
    if (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    ) {
      return "Local"
    }

    const response = await fetch(`http://ip-api.com/json/${ip}`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })

    if (!response.ok) return "Inconnu"

    const data = await response.json()

    if (data.city && data.country) {
      return `${data.city}, ${data.country}`
    }

    return "Inconnu"
  } catch {
    return "Inconnu"
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const qrcodeId = BigInt(id)

    // Get QR code from database
    const qrcode = await getQRCodeById(qrcodeId)

    if (!qrcode) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Track the click (non-blocking)
    const userAgent = request.headers.get("user-agent") || "Unknown"
    const referer = request.headers.get("referer") || ""

    // Get real IP (considering proxies)
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "Unknown"

    // Record click asynchronously (don't wait for it)
    getLocationFromIP(ip)
      .then((location) => {
        return recordClick(qrcodeId, {
          browser: userAgent,
          ip,
          location,
          referer,
        })
      })
      .catch((err) => {
        console.error("Error recording QR click:", err)
      })

    // Redirect to target URL
    return NextResponse.redirect(qrcode.link)
  } catch (error) {
    console.error("QR Code redirect error:", error)
    return NextResponse.redirect(new URL("/", request.url))
  }
}
