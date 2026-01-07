import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiToken, apiError, apiSuccess } from "../auth"

// GET /api/external/support/clients - List clients
export async function GET(request: NextRequest) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    const where: Record<string, unknown> = {
      tenant_id: context.tenantId,
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { contactEmail: { contains: search } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          client_type: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          address: true,
          postalCode: true,
          city: true,
          country: true,
          contactFirstname: true,
          contactLastname: true,
          contactEmail: true,
          contactPhone: true,
          status: true,
          createdAt: true,
          _count: {
            select: { tickets: true },
          },
        },
        orderBy: { companyName: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    return apiSuccess({
      clients: clients.map((client) => ({
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
        contact: {
          firstName: client.contactFirstname,
          lastName: client.contactLastname,
          email: client.contactEmail,
          phone: client.contactPhone,
        },
        status: client.status,
        ticketCount: client._count.tickets,
        createdAt: client.createdAt?.toISOString() || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[External API] Error fetching clients:", error)
    return apiError("Internal server error", 500)
  }
}

// POST /api/external/support/clients - Create client
export async function POST(request: NextRequest) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.companyName && !body.lastName) {
      return apiError("Missing required field: companyName or lastName", 400)
    }

    // Check if email already exists
    if (body.email) {
      const existingClient = await prisma.client.findFirst({
        where: {
          tenant_id: context.tenantId,
          email: body.email,
        },
      })

      if (existingClient) {
        return apiError("A client with this email already exists", 409)
      }
    }

    const client = await prisma.client.create({
      data: {
        tenant_id: context.tenantId,
        client_type: body.type || "company",
        companyName: body.companyName || `${body.firstName || ""} ${body.lastName || ""}`.trim(),
        first_name: body.firstName || null,
        last_name: body.lastName || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        postalCode: body.postalCode || null,
        city: body.city || null,
        country: body.country || "France",
        contactFirstname: body.contact?.firstName || null,
        contactLastname: body.contact?.lastName || null,
        contactEmail: body.contact?.email || null,
        contactPhone: body.contact?.phone || null,
        status: "active",
        createdAt: new Date(),
      },
    })

    return apiSuccess(
      {
        id: client.id.toString(),
        type: client.client_type,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        createdAt: client.createdAt?.toISOString() || null,
      },
      201
    )
  } catch (error) {
    console.error("[External API] Error creating client:", error)
    return apiError("Internal server error", 500)
  }
}
