import { NextRequest, NextResponse } from "next/server"
import { createCloudflareClient } from "@/lib/cloudflare"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiToken } = body

    if (!apiToken) {
      return NextResponse.json({
        success: false,
        message: "Token API manquant",
      })
    }

    // Create Cloudflare client with provided token
    const client = createCloudflareClient({ apiToken })

    // Verify token by listing zones
    const zones = await client.getZones()

    return NextResponse.json({
      success: true,
      message: "Connexion Cloudflare réussie",
      zones: zones.length,
    })
  } catch (error) {
    console.error("Cloudflare test error:", error)

    let message = "Erreur lors du test de connexion Cloudflare"

    if (error instanceof Error) {
      if (error.message.includes("Invalid API Token")) {
        message = "Token API invalide. Vérifiez que le token est correct et actif."
      } else if (error.message.includes("Authentication")) {
        message = "Erreur d'authentification. Vérifiez vos identifiants."
      } else {
        message = error.message
      }
    }

    return NextResponse.json({
      success: false,
      message,
    })
  }
}
