import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, type, tone, language } = body

    // Get OpenAI settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.json(
        { error: "Settings not configured" },
        { status: 400 }
      )
    }

    const settings = JSON.parse(tenant.settings as string)

    if (!settings.openaiEnabled || !settings.openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI is not configured" },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: settings.openaiApiKey,
    })

    const systemPrompt = `Tu es un expert en copywriting et email marketing. Tu dois générer du contenu email professionnel et engageant.

Règles:
- Écris en ${language || "français"}
- Ton: ${tone || "professionnel mais chaleureux"}
- Type d'email: ${type || "newsletter"}
- Le contenu doit être concis et impactant
- Inclus un appel à l'action clair si pertinent
- Tu peux utiliser ces variables pour personnaliser: {{name}}, {{prenom}}, {{entreprise}}, {{email}}

Retourne le résultat au format JSON avec les champs suivants:
{
  "subject": "L'objet de l'email",
  "preheader": "Le texte de prévisualisation (max 100 caractères)",
  "headline": "Le titre principal",
  "body": "Le contenu principal de l'email en HTML simple (paragraphes, listes, liens)",
  "cta": {
    "text": "Texte du bouton d'appel à l'action",
    "url": "URL du bouton (placeholder)"
  }
}`

    const response = await openai.chat.completions.create({
      model: settings.openaiModel || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      )
    }

    const result = JSON.parse(content)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Error generating email content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate content" },
      { status: 500 }
    )
  }
}
