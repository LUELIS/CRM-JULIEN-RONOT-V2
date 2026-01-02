import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Liste tous les services disponibles (pour le select) et ceux du client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get all available services
    const allServices = await prisma.service.findMany({
      where: {
        tenant_id: BigInt(1),
        isActive: true,
      },
      orderBy: { name: "asc" },
    })

    // Get client's current services
    const clientServices = await prisma.clientService.findMany({
      where: {
        clientId: BigInt(id),
      },
      include: {
        service: true,
      },
    })

    const clientServiceIds = clientServices.map((cs) => cs.serviceId.toString())

    return NextResponse.json({
      availableServices: allServices.map((s) => ({
        id: s.id.toString(),
        code: s.code,
        name: s.name,
        unitPriceHt: Number(s.unitPriceHt),
        vatRate: Number(s.vatRate),
        isRecurring: s.isRecurring,
        alreadyAssigned: clientServiceIds.includes(s.id.toString()),
      })),
      clientServices: clientServices.map((cs) => ({
        id: cs.id.toString(),
        serviceId: cs.serviceId.toString(),
        serviceName: cs.service.name,
        customPriceHt: cs.custom_price_ht ? Number(cs.custom_price_ht) : null,
        quantity: Number(cs.quantity),
        isActive: cs.is_active,
      })),
    })
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des services" },
      { status: 500 }
    )
  }
}

// POST - Ajoute un service au client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { serviceId, quantity, customPriceHt, isActive } = body

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service requis" },
        { status: 400 }
      )
    }

    // Check if already exists
    const existing = await prisma.clientService.findFirst({
      where: {
        clientId: BigInt(id),
        serviceId: BigInt(serviceId),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ce service est deja associe au client" },
        { status: 400 }
      )
    }

    const clientService = await prisma.clientService.create({
      data: {
        clientId: BigInt(id),
        serviceId: BigInt(serviceId),
        quantity: quantity || 1,
        custom_price_ht: customPriceHt || null,
        is_active: isActive !== false,
        startDate: new Date(),
      },
      include: {
        service: true,
      },
    })

    return NextResponse.json({
      success: true,
      clientService: {
        id: clientService.id.toString(),
        serviceId: clientService.serviceId.toString(),
        serviceName: clientService.service.name,
        quantity: Number(clientService.quantity),
        customPriceHt: clientService.custom_price_ht
          ? Number(clientService.custom_price_ht)
          : null,
        isActive: clientService.is_active,
      },
    })
  } catch (error) {
    console.error("Error adding service:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du service" },
      { status: 500 }
    )
  }
}
