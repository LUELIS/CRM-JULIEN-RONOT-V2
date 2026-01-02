import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: tenant.id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      logo: tenant.logo,
      timezone: tenant.timezone,
      currency: tenant.currency,
      status: tenant.status,
    })
  } catch (error) {
    console.error("Error fetching tenant:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du tenant" },
      { status: 500 }
    )
  }
}
