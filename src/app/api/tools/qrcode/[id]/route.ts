/**
 * QR Code API Routes - Single QR code operations
 * GET - Get single QR code
 * PUT - Update QR code
 * DELETE - Delete QR code
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getQRCodeById,
  updateQRCode,
  deleteQRCode,
} from "@/lib/qrcode-db"

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
    const qrcodeId = BigInt(id)

    const qrcode = await getQRCodeById(qrcodeId)

    if (!qrcode) {
      return NextResponse.json({ error: "QR code non trouvé" }, { status: 404 })
    }

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...qrcode,
      id: qrcode.id.toString(),
      tenant_id: qrcode.tenant_id.toString(),
    })
  } catch (error) {
    console.error("Error fetching QR code:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du QR code" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const qrcodeId = BigInt(id)

    const body = await request.json()
    const { name, link, tag } = body

    // Validate URL if provided
    if (link) {
      try {
        new URL(link)
      } catch {
        return NextResponse.json({ error: "URL invalide" }, { status: 400 })
      }
    }

    const qrcode = await updateQRCode(qrcodeId, { name, link, tag })

    if (!qrcode) {
      return NextResponse.json({ error: "QR code non trouvé" }, { status: 404 })
    }

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...qrcode,
      id: qrcode.id.toString(),
      tenant_id: qrcode.tenant_id.toString(),
    })
  } catch (error) {
    console.error("Error updating QR code:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du QR code" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const qrcodeId = BigInt(id)

    await deleteQRCode(qrcodeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting QR code:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du QR code" },
      { status: 500 }
    )
  }
}
