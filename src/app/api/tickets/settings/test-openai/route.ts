import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, model } = body

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "API Key requise" },
        { status: 400 }
      )
    }

    // Test OpenAI connection with a simple request
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Réponds simplement 'OK' pour confirmer que la connexion fonctionne.",
          },
        ],
        max_tokens: 10,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || "OK"
      return NextResponse.json({
        success: true,
        message: `Connexion OpenAI réussie ! Modèle: ${model || "gpt-4o-mini"}. Réponse: "${reply}"`,
      })
    } else {
      const error = await response.json()
      return NextResponse.json({
        success: false,
        message: `Erreur OpenAI: ${error.error?.message || "Clé API invalide"}`,
      })
    }
  } catch (error) {
    console.error("Error testing OpenAI:", error)
    return NextResponse.json(
      { success: false, message: "Erreur lors du test OpenAI" },
      { status: 500 }
    )
  }
}
