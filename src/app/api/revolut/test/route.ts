import { NextRequest, NextResponse } from "next/server"

// POST: Test Revolut connection with provided credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, environment = "sandbox" } = body

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key requis" },
        { status: 400 }
      )
    }

    // Build API URL based on environment
    const baseUrl = environment === "production"
      ? "https://b2b.revolut.com/api/1.0"
      : "https://sandbox-b2b.revolut.com/api/1.0"

    // Test connection by fetching accounts
    const response = await fetch(`${baseUrl}/accounts`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      const accountCount = Array.isArray(data) ? data.length : 0
      return NextResponse.json({
        success: true,
        message: `Connexion réussie! ${accountCount} compte(s) trouvé(s).`,
        accountCount,
      })
    } else {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        success: false,
        error: errorData.message || `Erreur ${response.status}: ${response.statusText}`,
      })
    }
  } catch (error) {
    console.error("[Revolut Test] Error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur de connexion à l'API Revolut" },
      { status: 500 }
    )
  }
}
