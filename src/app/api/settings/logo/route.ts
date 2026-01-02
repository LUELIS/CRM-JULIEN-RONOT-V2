import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP ou SVG." },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux. Maximum 2 Mo." },
        { status: 400 }
      )
    }

    // Get current tenant to delete old logo if exists
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    // Delete old logo if exists
    if (tenant?.logo) {
      const oldLogoPath = join(process.cwd(), "public", "uploads", tenant.logo)
      try {
        if (existsSync(oldLogoPath)) {
          await unlink(oldLogoPath)
        }
      } catch {
        // Ignore deletion errors
      }
    }

    // Create upload directory if not exists
    const uploadDir = join(process.cwd(), "public", "uploads", "logos")
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png"
    const filename = `logo-${Date.now()}.${ext}`
    const relativePath = `logos/${filename}`
    const fullPath = join(uploadDir, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(fullPath, buffer)

    // Update tenant
    await prisma.tenants.update({
      where: { id: BigInt(1) },
      data: {
        logo: relativePath,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      logo: relativePath,
    })
  } catch (error) {
    console.error("Error uploading logo:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload du logo" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    // Delete logo file if exists
    if (tenant?.logo) {
      const logoPath = join(process.cwd(), "public", "uploads", tenant.logo)
      try {
        if (existsSync(logoPath)) {
          await unlink(logoPath)
        }
      } catch {
        // Ignore deletion errors
      }
    }

    // Update tenant
    await prisma.tenants.update({
      where: { id: BigInt(1) },
      data: {
        logo: null,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting logo:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du logo" },
      { status: 500 }
    )
  }
}
