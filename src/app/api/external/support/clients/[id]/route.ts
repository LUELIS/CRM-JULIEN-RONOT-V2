import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiToken, apiError, apiSuccess } from "../../auth"

// GET /api/external/support/clients/:id - Get client details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const { id } = await params

    const client = await prisma.client.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: context.tenantId,
      },
      include: {
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { tickets: true },
        },
      },
    })

    if (!client) {
      return apiError("Client not found", 404)
    }

    return apiSuccess({
      id: client.id.toString(),
      type: client.client_type,
      companyName: client.companyName,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      postalCode: client.postalCode,
      city: client.city,
      country: client.country,
      siret: client.siret,
      vatNumber: client.vatNumber,
      contact: {
        firstName: client.contactFirstname,
        lastName: client.contactLastname,
        email: client.contactEmail,
        phone: client.contactPhone,
      },
      status: client.status,
      ticketCount: client._count.tickets,
      recentTickets: client.tickets.map((t) => ({
        id: t.id.toString(),
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt?.toISOString() || null,
      })),
      createdAt: client.createdAt?.toISOString() || null,
    })
  } catch (error) {
    console.error("[External API] Error fetching client:", error)
    return apiError("Internal server error", 500)
  }
}

// GET /api/external/support/clients/:id/tickets - Get client tickets
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const { id } = await params
    const body = await request.json()

    const existingClient = await prisma.client.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: context.tenantId,
      },
    })

    if (!existingClient) {
      return apiError("Client not found", 404)
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.companyName !== undefined) updateData.companyName = body.companyName
    if (body.firstName !== undefined) updateData.first_name = body.firstName
    if (body.lastName !== undefined) updateData.last_name = body.lastName
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.address !== undefined) updateData.address = body.address
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode
    if (body.city !== undefined) updateData.city = body.city
    if (body.country !== undefined) updateData.country = body.country

    if (body.contact) {
      if (body.contact.firstName !== undefined) updateData.contactFirstname = body.contact.firstName
      if (body.contact.lastName !== undefined) updateData.contactLastname = body.contact.lastName
      if (body.contact.email !== undefined) updateData.contactEmail = body.contact.email
      if (body.contact.phone !== undefined) updateData.contactPhone = body.contact.phone
    }

    const client = await prisma.client.update({
      where: { id: existingClient.id },
      data: updateData,
    })

    return apiSuccess({
      id: client.id.toString(),
      companyName: client.companyName,
      email: client.email,
      updatedAt: client.updatedAt?.toISOString() || null,
    })
  } catch (error) {
    console.error("[External API] Error updating client:", error)
    return apiError("Internal server error", 500)
  }
}
