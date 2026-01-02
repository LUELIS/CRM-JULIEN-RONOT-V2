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

const contractTemplates: Record<string, string> = {
  freelance: `Génère un contrat de prestation de services freelance complet incluant :
- Identification des parties (prestataire et client)
- Objet de la mission
- Durée et conditions d'exécution
- Rémunération et modalités de paiement
- Propriété intellectuelle
- Confidentialité
- Résiliation
- Loi applicable et juridiction`,

  nda: `Génère un accord de confidentialité (NDA) complet incluant :
- Définition des informations confidentielles
- Obligations des parties
- Durée de l'obligation de confidentialité
- Exceptions (informations publiques, etc.)
- Restitution des documents
- Sanctions en cas de violation
- Loi applicable`,

  rental: `Génère un bail commercial complet incluant :
- Désignation des lieux
- Durée du bail
- Loyer et charges
- Dépôt de garantie
- Destination des locaux
- Obligations du bailleur
- Obligations du preneur
- Conditions de renouvellement
- Résiliation`,

  partnership: `Génère un contrat de partenariat commercial incluant :
- Objet du partenariat
- Obligations réciproques
- Exclusivité éventuelle
- Durée et conditions de renouvellement
- Propriété intellectuelle
- Répartition des bénéfices
- Confidentialité
- Résiliation`,

  sale: `Génère un contrat de vente de biens/services incluant :
- Désignation du bien/service
- Prix et modalités de paiement
- Livraison/exécution
- Transfert de propriété
- Garanties
- Responsabilité
- Réclamations
- Loi applicable`,
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, templateId } = body

    const systemPrompt = `Tu es un expert juridique spécialisé dans la rédaction de contrats commerciaux en France.
Tu génères des contrats professionnels, complets et juridiquement solides.
Utilise un langage clair mais formel, approprié pour des documents légaux.
Structure le contrat avec des articles numérotés et des sous-sections si nécessaire.
Inclus des clauses standards de protection pour les deux parties.
Laisse des espaces pour les informations spécifiques (noms, dates, montants) avec des balises [À COMPLÉTER].
Formate le contrat en HTML valide avec des balises appropriées (<h1>, <h2>, <p>, <ul>, etc.).
Ne génère que le contenu HTML du contrat, sans balises <html>, <head> ou <body>.`

    let userPrompt = ""

    if (templateId && contractTemplates[templateId]) {
      userPrompt = contractTemplates[templateId]
      if (prompt) {
        userPrompt += `\n\nInformations complémentaires fournies par l'utilisateur : ${prompt}`
      }
    } else if (prompt) {
      userPrompt = `Génère un contrat professionnel basé sur cette description : ${prompt}`
    } else {
      return NextResponse.json(
        { error: "Veuillez fournir une description ou sélectionner un modèle" },
        { status: 400 }
      )
    }

    const { client, model } = await getOpenAIClient()

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "Erreur lors de la génération" },
        { status: 500 }
      )
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error generating contract:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la génération du contrat" },
      { status: 500 }
    )
  }
}
