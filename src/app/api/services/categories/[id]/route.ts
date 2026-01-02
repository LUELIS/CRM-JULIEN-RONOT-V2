import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const category = await prisma.serviceCategory.findUnique({
      where: { id: BigInt(id) },
      include: {
        _count: {
          select: { services: true },
        },
        services: {
          where: { isActive: true },
          take: 10,
          orderBy: { name: "asc" },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: "Catégorie non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: category.id.toString(),
      name: category.name,
      slug: category.slug,
      color: category.color,
      icon: category.icon,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      serviceCount: category._count.services,
      services: category.services.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        code: s.code,
        priceHt: Number(s.unitPriceHt),
      })),
    })
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la catégorie" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Generate slug if name changed
    let slug = body.slug
    if (body.name && !body.slug) {
      slug = body.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    }

    const category = await prisma.serviceCategory.update({
      where: { id: BigInt(id) },
      data: {
        name: body.name,
        slug: slug,
        color: body.color || "#6B7280",
        icon: body.icon || null,
        description: body.description || null,
        sortOrder: body.sortOrder || 0,
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
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la catégorie" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if category has services
    const category = await prisma.serviceCategory.findUnique({
      where: { id: BigInt(id) },
      include: {
        _count: {
          select: { services: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: "Catégorie non trouvée" },
        { status: 404 }
      )
    }

    if (category._count.services > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer cette catégorie car elle contient des services",
        },
        { status: 400 }
      )
    }

    await prisma.serviceCategory.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la catégorie" },
      { status: 500 }
    )
  }
}
