import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - List active services for the current client
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Get user with client info
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        clientId: true,
        role: true,
      },
    })

    if (!currentUser?.clientId || currentUser.role !== "client") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
    }

    // Get client services with service details
    const clientServices = await prisma.clientService.findMany({
      where: {
        clientId: currentUser.clientId,
        is_active: true,
      },
      include: {
        service: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            unitPriceHt: true,
            vatRate: true,
            isRecurring: true,
          },
        },
      },
      orderBy: [
        { service: { isRecurring: "desc" } },
        { service: { name: "asc" } },
      ],
    })

    // Calculate totals
    const services = clientServices.map((cs) => {
      const priceHt = cs.custom_price_ht || cs.service.unitPriceHt
      const totalHt = Number(priceHt) * Number(cs.quantity)
      const vatAmount = totalHt * (Number(cs.service.vatRate) / 100)
      const totalTtc = totalHt + vatAmount

      return {
        id: String(cs.id),
        serviceId: String(cs.service.id),
        code: cs.service.code,
        name: cs.service.name,
        description: cs.service.description,
        quantity: Number(cs.quantity),
        unitPriceHt: Number(priceHt),
        vatRate: Number(cs.service.vatRate),
        totalHt,
        totalTtc,
        isRecurring: cs.service.isRecurring,
        startDate: cs.startDate?.toISOString() || null,
        endDate: cs.endDate?.toISOString() || null,
      }
    })

    // Calculate summary
    const recurringServices = services.filter((s) => s.isRecurring)
    const oneTimeServices = services.filter((s) => !s.isRecurring)

    // For recurring, assume monthly
    const monthlyTotal = recurringServices.reduce((sum, s) => sum + s.totalTtc, 0)

    return NextResponse.json({
      services,
      summary: {
        totalServices: services.length,
        recurringCount: recurringServices.length,
        oneTimeCount: oneTimeServices.length,
        monthlyTotal,
      },
    })
  } catch (error) {
    console.error("Error fetching client services:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des services" },
      { status: 500 }
    )
  }
}
