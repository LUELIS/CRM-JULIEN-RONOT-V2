import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export interface ApiContext {
  valid: boolean
  tenantId: bigint
  apiKeyId: bigint
  error?: string
}

/**
 * Validate API token from Authorization header
 * Format: Bearer <api_token>
 */
export async function validateApiToken(request: NextRequest): Promise<ApiContext> {
  const authHeader = request.headers.get("Authorization")

  if (!authHeader) {
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Missing Authorization header" }
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Invalid Authorization format. Use: Bearer <token>" }
  }

  const token = authHeader.slice(7)

  if (!token || token.length < 32) {
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Invalid API token" }
  }

  try {
    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const apiKey = await prisma.externalApiKey.findFirst({
      where: {
        tokenHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!apiKey) {
      return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Invalid or expired API token" }
    }

    // Check permissions
    const permissions = apiKey.permissions ? JSON.parse(apiKey.permissions) : []
    if (!permissions.includes("support") && !permissions.includes("*")) {
      return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "API token does not have support permissions" }
    }

    // Update last used
    await prisma.externalApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    return {
      valid: true,
      tenantId: apiKey.tenant_id,
      apiKeyId: apiKey.id,
    }
  } catch (error) {
    console.error("[API Auth] Error validating token:", error)
    return { valid: false, tenantId: BigInt(0), apiKeyId: BigInt(0), error: "Authentication error" }
  }
}

/**
 * Generate a new API token
 */
export function generateApiToken(): { token: string; hash: string } {
  // Generate a 32-byte random token
  const tokenBytes = crypto.randomBytes(32)
  const token = `crm_${tokenBytes.toString("hex")}`
  const hash = crypto.createHash("sha256").update(token).digest("hex")
  return { token, hash }
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: status,
      },
    },
    { status }
  )
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}
