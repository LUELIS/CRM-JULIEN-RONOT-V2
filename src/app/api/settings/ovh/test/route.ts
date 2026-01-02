import { NextRequest, NextResponse } from "next/server"
import { createOvhClient } from "@/lib/ovh"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { appKey, appSecret, consumerKey, endpoint } = body

    if (!appKey || !appSecret || !consumerKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Veuillez renseigner toutes les clés API",
        },
        { status: 400 }
      )
    }

    const client = createOvhClient({
      appKey,
      appSecret,
      consumerKey,
      endpoint: endpoint || "ovh-eu",
    })

    const result = await client.testConnection()

    return NextResponse.json({
      success: true,
      message: "Connexion réussie",
      domains: result.domains,
    })
  } catch (error) {
    console.error("OVH connection test error:", error)
    return NextResponse.json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erreur de connexion à l'API OVH",
    })
  }
}
