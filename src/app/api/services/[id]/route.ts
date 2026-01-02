import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const service = await prisma.service.findUnique({
      where: { id: BigInt(id) },
      include: {
        category: true,
        _count: {
          select: {
            invoiceItems: true,
            quoteItems: true,
            subscriptionItems: true,
            clients: true,
          },
        },
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: "Service non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: service.id.toString(),
      code: service.code,
      name: service.name,
      description: service.description,
      priceHt: Number(service.unitPriceHt),
      vatRate: Number(service.vatRate),
      unit: service.unit,
      isActive: service.isActive,
      isRecurring: service.isRecurring,
      categoryId: service.categoryId?.toString() || null,
      category: service.category
        ? {
            id: service.category.id.toString(),
            name: service.category.name,
            color: service.category.color,
          }
        : null,
      usage: {
        invoices: service._count.invoiceItems,
        quotes: service._count.quoteItems,
        subscriptions: service._count.subscriptionItems,
        clients: service._count.clients,
      },
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    })
  } catch (error) {
    console.error("Error fetching service:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du service" },
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

    const service = await prisma.service.update({
      where: { id: BigInt(id) },
      data: {
        name: body.name,
        description: body.description || null,
        unitPriceHt: body.priceHt,
        vatRate: body.vatRate || 20,
        unit: body.unit || "unité",
        isActive: body.isActive !== false,
        isRecurring: body.isRecurring || false,
        categoryId: body.categoryId ? BigInt(body.categoryId) : null,
        updatedAt: new Date(),
      },
      include: {
        category: true,
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
      isRecurring: service.isRecurring,
      category: service.category
        ? {
            id: service.category.id.toString(),
            name: service.category.name,
          }
        : null,
    })
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du service" },
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

    // Check if service is used
    const service = await prisma.service.findUnique({
      where: { id: BigInt(id) },
      include: {
        _count: {
          select: {
            invoiceItems: true,
            quoteItems: true,
            subscriptionItems: true,
          },
        },
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: "Service non trouvé" },
        { status: 404 }
      )
    }

    const totalUsage =
      service._count.invoiceItems +
      service._count.quoteItems +
      service._count.subscriptionItems

    if (totalUsage > 0) {
      // Soft delete - mark as inactive
      await prisma.service.update({
        where: { id: BigInt(id) },
        data: { isActive: false },
      })
      return NextResponse.json({ success: true, softDeleted: true })
    }

    // Hard delete if not used
    await prisma.service.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du service" },
      { status: 500 }
    )
  }
}
