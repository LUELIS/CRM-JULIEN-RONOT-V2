/**
 * QR Code Stats API Route
 * GET - Get click statistics for a QR code
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getClickStats, getClicksByQRCodeId } from "@/lib/qrcode-db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const qrcodeId = parseInt(id, 10)

    if (isNaN(qrcodeId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const [stats, recentClicks] = await Promise.all([
      getClickStats(qrcodeId),
      getClicksByQRCodeId(qrcodeId),
    ])

    return NextResponse.json({ stats, recentClicks })
  } catch (error) {
    console.error("Error fetching QR code stats:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
