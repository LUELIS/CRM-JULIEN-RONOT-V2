import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const domain = await prisma.domain.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    })

    if (!domain) {
      return NextResponse.json(
        { error: "Domaine non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: domain.id.toString(),
      domain: domain.domain,
      registrar: domain.registrar,
      externalId: domain.externalId,
      status: domain.status,
      nameServerType: domain.nameServerType,
      offer: domain.offer,
      expirationDate: domain.expirationDate?.toISOString() || null,
      autoRenew: domain.autoRenew,
      notes: domain.notes,
      purchasePrice: domain.purchasePrice ? Number(domain.purchasePrice) : null,
      resalePrice: domain.resalePrice ? Number(domain.resalePrice) : null,
      renewalCostPrice: domain.renewalCostPrice ? Number(domain.renewalCostPrice) : null,
      renewalResalePrice: domain.renewalResalePrice ? Number(domain.renewalResalePrice) : null,
      lastSyncAt: domain.lastSyncAt?.toISOString() || null,
      createdAt: domain.createdAt?.toISOString() || null,
      updatedAt: domain.updatedAt?.toISOString() || null,
      clientId: domain.clientId?.toString() || null,
      client: domain.client
        ? {
            id: domain.client.id.toString(),
            companyName: domain.client.companyName,
            email: domain.client.email,
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching domain:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du domaine" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const domain = await prisma.domain.update({
      where: { id: BigInt(id) },
      data: {
        clientId: body.clientId ? BigInt(body.clientId) : null,
        notes: body.notes || null,
        autoRenew: body.autoRenew !== undefined ? body.autoRenew : undefined,
        purchasePrice: body.purchasePrice !== undefined ? (body.purchasePrice ? parseFloat(body.purchasePrice) : null) : undefined,
        resalePrice: body.resalePrice !== undefined ? (body.resalePrice ? parseFloat(body.resalePrice) : null) : undefined,
        renewalCostPrice: body.renewalCostPrice !== undefined ? (body.renewalCostPrice ? parseFloat(body.renewalCostPrice) : null) : undefined,
        renewalResalePrice: body.renewalResalePrice !== undefined ? (body.renewalResalePrice ? parseFloat(body.renewalResalePrice) : null) : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: domain.id.toString(),
      domain: domain.domain,
      registrar: domain.registrar,
      status: domain.status,
      clientId: domain.clientId?.toString() || null,
      client: domain.client
        ? {
            id: domain.client.id.toString(),
            companyName: domain.client.companyName,
          }
        : null,
      notes: domain.notes,
      autoRenew: domain.autoRenew,
      purchasePrice: domain.purchasePrice ? Number(domain.purchasePrice) : null,
      resalePrice: domain.resalePrice ? Number(domain.resalePrice) : null,
      renewalCostPrice: domain.renewalCostPrice ? Number(domain.renewalCostPrice) : null,
      renewalResalePrice: domain.renewalResalePrice ? Number(domain.renewalResalePrice) : null,
    })
  } catch (error) {
    console.error("Error updating domain:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du domaine" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.domain.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting domain:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du domaine" },
      { status: 500 }
    )
  }
}
