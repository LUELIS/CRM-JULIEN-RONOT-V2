import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { services: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(
      categories.map((cat) => ({
        id: cat.id.toString(),
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        icon: cat.icon,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        serviceCount: cat._count.services,
      }))
    )
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des catégories" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: "Le nom est requis" },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = body.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    const category = await prisma.serviceCategory.create({
      data: {
        tenant_id: BigInt(1),
        name: body.name,
        slug,
        color: body.color || "#6B7280",
        icon: body.icon || null,
        description: body.description || null,
        sortOrder: body.sortOrder || 0,
        isActive: true,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      id: category.id.toString(),
      name: category.name,
      slug: category.slug,
      color: category.color,
      icon: category.icon,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la catégorie" },
      { status: 500 }
    )
  }
}
