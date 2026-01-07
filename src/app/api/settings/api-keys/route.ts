import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateApiToken } from "@/app/api/external/support/auth"

const DEFAULT_TENANT_ID = BigInt(1)

// GET /api/settings/api-keys - List API keys
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const apiKeys = await prisma.externalApiKey.findMany({
      where: { tenant_id: DEFAULT_TENANT_ID },
      include: {
        creator: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id.toString(),
        name: key.name,
        description: key.description,
        tokenPrefix: key.tokenPrefix,
        permissions: key.permissions ? JSON.parse(key.permissions) : [],
        isActive: key.isActive,
        expiresAt: key.expiresAt?.toISOString() || null,
        lastUsedAt: key.lastUsedAt?.toISOString() || null,
        rateLimit: key.rateLimit,
        createdAt: key.createdAt.toISOString(),
        createdBy: key.creator
          ? { name: key.creator.name, email: key.creator.email }
          : null,
      })),
    })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des clés API" },
      { status: 500 }
    )
  }
}

// POST /api/settings/api-keys - Create API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
    }

    // Generate token
    const { token, hash } = generateApiToken()
    const tokenPrefix = token.substring(0, 12) // "crm_xxxxxxxx"

    // Default permissions
    const permissions = body.permissions || ["support"]

    // Create API key
    const apiKey = await prisma.externalApiKey.create({
      data: {
        tenant_id: DEFAULT_TENANT_ID,
        name: body.name,
        description: body.description || null,
        tokenHash: hash,
        tokenPrefix,
        permissions: JSON.stringify(permissions),
        isActive: true,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        rateLimit: body.rateLimit || 1000,
        createdBy: BigInt(session.user.id),
      },
    })

    // Return the token ONLY on creation (it won't be retrievable later)
    return NextResponse.json({
      id: apiKey.id.toString(),
      name: apiKey.name,
      token, // ⚠️ Only returned once at creation
      tokenPrefix: apiKey.tokenPrefix,
      permissions,
      expiresAt: apiKey.expiresAt?.toISOString() || null,
      message: "Clé API créée avec succès. Copiez le token maintenant, il ne sera plus affiché.",
    })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la clé API" },
      { status: 500 }
    )
  }
}
