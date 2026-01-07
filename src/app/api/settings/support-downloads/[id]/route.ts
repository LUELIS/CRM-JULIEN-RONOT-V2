import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getS3Config, deleteFromS3 } from "@/lib/s3"

const DEFAULT_TENANT_ID = BigInt(1)

// DELETE /api/settings/support-downloads/:id - Delete a download
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

    // Find the download
    const download = await prisma.supportDownload.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: DEFAULT_TENANT_ID,
      },
    })

    if (!download) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    // Delete from S3
    const s3Config = await getS3Config()
    if (s3Config) {
      await deleteFromS3(download.s3Key, s3Config)
    }

    // Delete from database
    await prisma.supportDownload.delete({
      where: { id: download.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting support download:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du fichier" },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/support-downloads/:id - Update download (activate/deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Find the download
    const download = await prisma.supportDownload.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: DEFAULT_TENANT_ID,
      },
    })

    if (!download) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.isActive !== undefined) {
      // If activating, deactivate other files for same platform
      if (body.isActive) {
        await prisma.supportDownload.updateMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            platform: download.platform,
            isActive: true,
            id: { not: download.id },
          },
          data: { isActive: false },
        })
      }
      updateData.isActive = body.isActive
    }

    if (body.version !== undefined) {
      updateData.version = body.version
    }

    const updated = await prisma.supportDownload.update({
      where: { id: download.id },
      data: updateData,
    })

    return NextResponse.json({
      id: updated.id.toString(),
      isActive: updated.isActive,
      version: updated.version,
    })
  } catch (error) {
    console.error("Error updating support download:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du fichier" },
      { status: 500 }
    )
  }
}
