import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

// GET /api/public/support-downloads - List available downloads (public)
export async function GET() {
  try {
    // Get tenant info
    const tenant = await prisma.tenants.findUnique({
      where: { id: DEFAULT_TENANT_ID },
      select: {
        name: true,
        logo: true,
        settings: true,
      },
    })

    const settings = tenant?.settings
      ? typeof tenant.settings === "string"
        ? JSON.parse(tenant.settings)
        : tenant.settings
      : {}

    // Get active downloads
    const downloads = await prisma.supportDownload.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        isActive: true,
      },
      orderBy: { platform: "asc" },
    })

    return NextResponse.json({
      tenant: {
        name: tenant?.name || "Support",
        logo: tenant?.logo || null,
        supportPhone: settings.phone || null,
        supportEmail: settings.supportEmail || tenant?.name ? `support@${tenant?.name?.toLowerCase().replace(/\s+/g, "")}.fr` : null,
      },
      downloads: downloads.map((d) => ({
        id: d.id.toString(),
        platform: d.platform,
        fileName: d.originalName,
        version: d.version,
        fileSize: Number(d.fileSize),
        downloadCount: d.downloadCount,
      })),
    })
  } catch (error) {
    console.error("Error fetching support downloads:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des téléchargements" },
      { status: 500 }
    )
  }
}
