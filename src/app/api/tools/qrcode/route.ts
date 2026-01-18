/**
 * QR Code API Routes
 * GET - List all QR codes with stats
 * POST - Create new QR code
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getQRCodes,
  createQRCode,
  getGlobalStats,
} from "@/lib/qrcode-db"

const TENANT_ID = BigInt(1)

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const [qrcodes, stats] = await Promise.all([
      getQRCodes(TENANT_ID),
      getGlobalStats(TENANT_ID),
    ])

    // Convert BigInt to string for JSON serialization
    const serializedQrcodes = qrcodes.map(qr => ({
      ...qr,
      id: qr.id.toString(),
      tenant_id: qr.tenant_id.toString(),
    }))

    return NextResponse.json({ qrcodes: serializedQrcodes, stats })
  } catch (error) {
    console.error("Error fetching QR codes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des QR codes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { name, link, tag } = body

    if (!name || !link) {
      return NextResponse.json(
        { error: "Nom et lien requis" },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(link)
    } catch {
      return NextResponse.json(
        { error: "URL invalide" },
        { status: 400 }
      )
    }

    const qrcode = await createQRCode({ tenant_id: TENANT_ID, name, link, tag })

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...qrcode,
      id: qrcode.id.toString(),
      tenant_id: qrcode.tenant_id.toString(),
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating QR code:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du QR code" },
      { status: 500 }
    )
  }
}
