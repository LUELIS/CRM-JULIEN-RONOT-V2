import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT - Met à jour un service client (quantité, prix, statut)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params

  try {
    const body = await request.json()
    const { quantity, customPriceHt, isActive } = body

    // Find client service by client + service ID
    const clientService = await prisma.clientService.findFirst({
      where: {
        clientId: BigInt(id),
        serviceId: BigInt(serviceId),
      },
    })

    if (!clientService) {
      return NextResponse.json(
        { error: "Service non trouve pour ce client" },
        { status: 404 }
      )
    }

    const updated = await prisma.clientService.update({
      where: { id: clientService.id },
      data: {
        quantity: quantity !== undefined ? quantity : undefined,
        custom_price_ht: customPriceHt !== undefined ? customPriceHt : undefined,
        is_active: isActive !== undefined ? isActive : undefined,
      },
      include: {
        service: true,
      },
    })

    return NextResponse.json({
      success: true,
      clientService: {
        id: updated.id.toString(),
        serviceId: updated.serviceId.toString(),
        serviceName: updated.service.name,
        quantity: Number(updated.quantity),
        customPriceHt: updated.custom_price_ht
          ? Number(updated.custom_price_ht)
          : null,
        isActive: updated.is_active,
      },
    })
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du service" },
      { status: 500 }
    )
  }
}

// DELETE - Supprime un service du client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params

  try {
    const clientService = await prisma.clientService.findFirst({
      where: {
        clientId: BigInt(id),
        serviceId: BigInt(serviceId),
      },
    })

    if (!clientService) {
      return NextResponse.json(
        { error: "Service non trouve pour ce client" },
        { status: 404 }
      )
    }

    await prisma.clientService.delete({
      where: { id: clientService.id },
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
