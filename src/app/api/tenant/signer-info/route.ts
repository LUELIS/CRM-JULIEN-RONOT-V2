import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get tenant info formatted for quick signer add
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: "Configuration entreprise non trouvée" },
        { status: 404 }
      )
    }

    // Parse tenant settings for additional info
    let settings: Record<string, string> = {}
    try {
      if (tenant.settings) {
        settings = JSON.parse(tenant.settings as string)
      }
    } catch {
      settings = {}
    }

    // Get owner name from settings or use company name
    const ownerName = settings.ownerName || settings.contactName || tenant.name

    return NextResponse.json({
      success: true,
      signerInfo: {
        name: ownerName,
        email: tenant.email || "",
        phone: tenant.phone || "",
        companyName: tenant.name,
      },
    })
  } catch (error) {
    console.error("Error fetching tenant signer info:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des informations" },
      { status: 500 }
    )
  }
}
