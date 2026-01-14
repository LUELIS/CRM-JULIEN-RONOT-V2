import { NextRequest, NextResponse } from "next/server"
import { createMySendmailClient } from "@/lib/my-sendmail"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API requise" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })

    // Test connection by fetching domains
    const result = await client.testConnection()

    return NextResponse.json({
      success: true,
      message: `Connexion réussie - ${result.domains} domaine${result.domains > 1 ? "s" : ""} trouvé${result.domains > 1 ? "s" : ""}`,
      domains: result.domains,
    })
  } catch (error) {
    console.error("My-Sendmail test error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur de connexion à My-Sendmail",
      },
      { status: 400 }
    )
  }
}
