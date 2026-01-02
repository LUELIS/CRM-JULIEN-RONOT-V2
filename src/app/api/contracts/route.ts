import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"

// GET - List contracts
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const perPage = parseInt(searchParams.get("perPage") || "15")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const clientId = searchParams.get("clientId") || ""
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const where: Prisma.ContractWhereInput = {
      tenant_id: BigInt(1), // TODO: get from session
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { client: { companyName: { contains: search } } },
      ]
    }

    if (status && status !== "all") {
      where.status = status as Prisma.EnumContractStatusFilter["equals"]
    }

    if (clientId) {
      where.clientId = BigInt(clientId)
    }

    const [contracts, total, statusCounts] = await Promise.all([
      prisma.contract.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
          signers: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              signerType: true,
            },
          },
          documents: {
            select: {
              id: true,
              filename: true,
            },
          },
        },
      }),
      prisma.contract.count({ where }),
      prisma.contract.groupBy({
        by: ["status"],
        where: { tenant_id: BigInt(1) },
        _count: true,
      }),
    ])

    const stats = {
      total: 0,
      draft: 0,
      sent: 0,
      completed: 0,
      declined: 0,
      expired: 0,
    }

    statusCounts.forEach((s) => {
      stats.total += s._count
      const st = s.status as keyof typeof stats
      if (st in stats) {
        stats[st] = s._count
      }
    })

    return NextResponse.json({
      contracts: contracts.map((c) => ({
        id: c.id.toString(),
        title: c.title,
        description: c.description,
        status: c.status,
        expirationDays: c.expirationDays,
        sentAt: c.sentAt?.toISOString(),
        completedAt: c.completedAt?.toISOString(),
        expiresAt: c.expiresAt?.toISOString(),
        createdAt: c.createdAt?.toISOString(),
        client: {
          id: c.client.id.toString(),
          companyName: c.client.companyName,
          email: c.client.email,
        },
        signers: c.signers.map((s) => ({
          id: s.id.toString(),
          name: s.name,
          email: s.email,
          status: s.status,
          type: s.signerType,
        })),
        documentsCount: c.documents.length,
      })),
      stats,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des contrats" },
      { status: 500 }
    )
  }
}

// POST - Create contract
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientId,
      title,
      description,
      content,
      htmlContent,
      expirationDays,
      lockOrder,
      signerReminders,
      signers,
    } = body

    if (!clientId || !title) {
      return NextResponse.json(
        { error: "Client et titre requis" },
        { status: 400 }
      )
    }

    // Check client exists
    const client = await prisma.client.findUnique({
      where: { id: BigInt(clientId) },
    })

    if (!client) {
      return NextResponse.json(
        { error: "Client non trouvé" },
        { status: 404 }
      )
    }

    // Create contract with optional signers
    const contract = await prisma.contract.create({
      data: {
        tenant_id: BigInt(1), // TODO: get from session
        clientId: BigInt(clientId),
        title,
        description,
        content: htmlContent || content, // Support both HTML and plain content
        expirationDays: expirationDays || 30,
        lockOrder: lockOrder || false,
        signerReminders: signerReminders !== false,
        createdAt: new Date(),
        // Create signers if provided
        ...(signers && signers.length > 0
          ? {
              signers: {
                create: signers.map(
                  (
                    s: {
                      name: string
                      email: string
                      phone?: string
                      signerType?: string
                      sortOrder?: number
                      language?: string
                      accessCode?: string
                    },
                    i: number
                  ) => ({
                    name: s.name,
                    email: s.email,
                    phone: s.phone || null,
                    signerType: s.signerType || "signer",
                    sortOrder: s.sortOrder ?? i,
                    language: s.language || "fr",
                    accessCode: s.accessCode || null,
                    status: "pending",
                    createdAt: new Date(),
                  })
                ),
              },
            }
          : {}),
      },
      include: {
        signers: true,
      },
    })

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id.toString(),
        title: contract.title,
        status: contract.status,
        signersCount: contract.signers.length,
      },
    })
  } catch (error) {
    console.error("Error creating contract:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du contrat" },
      { status: 500 }
    )
  }
}
