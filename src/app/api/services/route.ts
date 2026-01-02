import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("perPage") || "15")
  const search = searchParams.get("search") || ""
  const categoryId = searchParams.get("categoryId") || ""

  try {
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = BigInt(categoryId)
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          category: true,
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { name: "asc" },
      }),
      prisma.service.count({ where }),
    ])

    const serializedServices = services.map((service) => ({
      id: service.id.toString(),
      code: service.code,
      name: service.name,
      description: service.description,
      priceHt: Number(service.unitPriceHt),
      vatRate: Number(service.vatRate),
      unit: service.unit,
      isActive: service.isActive,
      isRecurring: service.isRecurring,
      category: service.category
        ? {
            id: service.category.id.toString(),
            name: service.category.name,
          }
        : null,
    }))

    return NextResponse.json({
      services: serializedServices,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des services" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, priceHt, vatRate, unit, categoryId, isActive, isRecurring } = body

    if (!name || priceHt === undefined) {
      return NextResponse.json(
        { error: "Le nom et le prix HT sont requis" },
        { status: 400 }
      )
    }

    // Generate unique code
    const code = `SRV-${Date.now()}`

    const service = await prisma.service.create({
      data: {
        tenant_id: BigInt(1),
        code,
        name,
        description: description || null,
        unitPriceHt: priceHt,
        vatRate: vatRate || 20,
        unit: unit || "unité",
        isActive: isActive !== false,
        isRecurring: isRecurring || false,
        categoryId: categoryId ? BigInt(categoryId) : null,
      },
    })

    return NextResponse.json({
      id: service.id.toString(),
      code: service.code,
      name: service.name,
      description: service.description,
      priceHt: Number(service.unitPriceHt),
      vatRate: Number(service.vatRate),
      unit: service.unit,
      isActive: service.isActive,
    })
  } catch (error) {
    console.error("Error creating service:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du service" },
      { status: 500 }
    )
  }
}
