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

// Mapping from old QR code IDs to new IDs (after migration)
// Old IDs from tools.westarter.fr -> New IDs in CRM
const OLD_TO_NEW_ID_MAP: Record<number, number> = {
  2: 3,   // Charline
  6: 6,   // Keymex Synergie Estimation
  10: 9,  // Julie & Yann - CDVD
  14: 12, // Ensemble pour emma
  15: 15, // J'aime Keymex 2024
  16: 18, // James DEPA - CV
}

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
    let qrcodeId = BigInt(id)

    // Check if this is an old ID that needs mapping
    const oldId = parseInt(id, 10)
    if (OLD_TO_NEW_ID_MAP[oldId]) {
      qrcodeId = BigInt(OLD_TO_NEW_ID_MAP[oldId])
    }

    // Get QR code from database
    const qrcode = await getQRCodeById(qrcodeId)

    if (!qrcode) {
      // Fallback redirect - use host header to build proper URL
      const host = request.headers.get("host") || "crm.sdweb.tech"
      const protocol = request.headers.get("x-forwarded-proto") || "https"
      return NextResponse.redirect(new URL("/", `${protocol}://${host}`))
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
    // Fallback redirect - use host header to build proper URL
    const host = request.headers.get("host") || "crm.sdweb.tech"
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    return NextResponse.redirect(new URL("/", `${protocol}://${host}`))
  }
}
