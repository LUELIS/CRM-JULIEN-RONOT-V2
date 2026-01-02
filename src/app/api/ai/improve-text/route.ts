import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

async function getOpenAIClient() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    throw new Error("Configuration non trouvée")
  }

  const settings = JSON.parse(tenant.settings as string)

  if (!settings.openaiEnabled || !settings.openaiApiKey) {
    throw new Error("OpenAI n'est pas configuré. Allez dans Paramètres > Tickets pour configurer la clé API.")
  }

  return {
    client: new OpenAI({ apiKey: settings.openaiApiKey }),
    model: settings.openaiModel || "gpt-4o-mini",
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { text } = body

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Texte requis" },
        { status: 400 }
      )
    }

    const { client, model } = await getOpenAIClient()

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `Tu es un expert juridique spécialisé dans la rédaction de contrats.
L'utilisateur te donne un extrait de texte contractuel.
Améliore ce texte pour le rendre plus professionnel, clair et juridiquement précis.
Conserve le sens original mais améliore la formulation.
Retourne uniquement le texte amélioré, sans explications ni commentaires.
Si le texte contient du HTML, conserve la structure HTML.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    })

    const improved = completion.choices[0]?.message?.content
    if (!improved) {
      return NextResponse.json(
        { error: "Erreur lors de l'amélioration" },
        { status: 500 }
      )
    }

    return NextResponse.json({ improved })
  } catch (error) {
    console.error("Error improving text:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'amélioration du texte" },
      { status: 500 }
    )
  }
}
