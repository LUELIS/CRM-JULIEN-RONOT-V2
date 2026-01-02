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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const quoteId = BigInt(id)

    // Get the quote with its items and client
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 })
    }

    // Check if a contract already exists for this quote
    const existingContract = await prisma.contract.findFirst({
      where: { quoteId },
    })

    if (existingContract) {
      return NextResponse.json(
        { error: "Un contrat existe déjà pour ce devis", contractId: existingContract.id.toString() },
        { status: 400 }
      )
    }

    // Get tenant info for the contract (provider info)
    const tenant = await prisma.tenants.findFirst({
      where: { id: quote.tenant_id },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Configuration entreprise non trouvée" }, { status: 404 })
    }

    // Parse tenant settings
    let tenantSettings: Record<string, string> = {}
    try {
      if (tenant.settings) {
        tenantSettings = JSON.parse(tenant.settings as string)
      }
    } catch {
      tenantSettings = {}
    }

    // Build quote context for AI with COMPLETE provider and client info
    const itemsList = quote.items.map((item, index) => {
      return `${index + 1}. ${item.title || item.service?.name || "Prestation"}: ${item.description}
   - Quantité: ${item.quantity} ${item.unit}
   - Prix unitaire HT: ${item.unitPriceHt}€
   - TVA: ${item.vatRate}%
   - Total HT: ${item.totalHt}€`
    }).join("\n")

    // Format addresses properly
    const providerAddress = [
      tenant.address,
      [tenantSettings.postalCode, tenantSettings.city].filter(Boolean).join(" ")
    ].filter(Boolean).join(", ")

    const clientAddress = [
      quote.client.address,
      [quote.client.postalCode, quote.client.city].filter(Boolean).join(" "),
      quote.client.country
    ].filter(Boolean).join(", ")

    const quoteContext = `
=== INFORMATIONS DU PRESTATAIRE (MOI) ===
- Raison sociale: ${tenant.name}
- SIRET: ${tenantSettings.siret || "Non renseigné"}
- Adresse: ${providerAddress || "Non renseignée"}
- Email: ${tenant.email || "Non renseigné"}
- Téléphone: ${tenant.phone || "Non renseigné"}
- Site web: ${tenantSettings.website || "Non renseigné"}

=== INFORMATIONS DU CLIENT ===
- Raison sociale: ${quote.client.companyName}
- Type: ${quote.client.client_type === "company" ? "Société" : "Particulier"}
${quote.client.first_name || quote.client.last_name ? `- Contact: ${quote.client.first_name || ""} ${quote.client.last_name || ""}` : ""}
${quote.client.contactFirstname || quote.client.contactLastname ? `- Contact principal: ${quote.client.contactFirstname || ""} ${quote.client.contactLastname || ""}` : ""}
- SIRET: ${quote.client.siret || "Non renseigné"}
- N° TVA: ${quote.client.vatNumber || "Non renseigné"}
- Adresse: ${clientAddress || "Non renseignée"}
- Email: ${quote.client.email || "Non renseigné"}
- Téléphone: ${quote.client.phone || "Non renseigné"}

=== DEVIS N°${quote.quoteNumber} ===

PRESTATIONS:
${itemsList}

TOTAUX:
- Sous-total HT: ${quote.subtotalHt}€
- TVA: ${quote.taxAmount}€
- Total TTC: ${quote.totalTtc}€

DATES:
- Date d'émission du devis: ${quote.issueDate.toLocaleDateString("fr-FR")}
- Date de validité: ${quote.validityDate.toLocaleDateString("fr-FR")}

NOTES DU DEVIS:
${quote.notes || "Aucune"}

CONDITIONS GÉNÉRALES DU DEVIS:
${quote.termsConditions || "Non spécifiées"}
`

    const systemPrompt = `Tu es un expert juridique spécialisé dans la rédaction de contrats commerciaux en France.
Tu dois transformer un devis accepté en contrat de prestation de services professionnel et juridiquement solide.

INSTRUCTIONS:
1. Reprends toutes les informations du devis (client, prestations, montants)
2. Structure le contrat avec des articles numérotés
3. Ajoute les clauses standards de protection pour les deux parties
4. Inclus: objet, durée, obligations, paiement, propriété intellectuelle, confidentialité, résiliation, litiges
5. Formate en HTML valide avec <h1>, <h2>, <p>, <ul>
6. Les montants et prestations doivent correspondre exactement au devis
7. Laisse des espaces [À COMPLÉTER] uniquement pour les informations manquantes (date de début, etc.)
8. Ne génère que le contenu HTML, sans <html>, <head> ou <body>`

    const { client, model } = await getOpenAIClient()

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transforme ce devis en contrat de prestation de services:\n\n${quoteContext}` },
      ],
    })

    const contractContent = completion.choices[0]?.message?.content
    if (!contractContent) {
      return NextResponse.json(
        { error: "Erreur lors de la génération du contrat" },
        { status: 500 }
      )
    }

    // Create the contract linked to the quote
    const contract = await prisma.contract.create({
      data: {
        tenant_id: quote.tenant_id,
        clientId: quote.clientId,
        quoteId: quote.id,
        title: `Contrat - Devis ${quote.quoteNumber}`,
        description: `Contrat généré depuis le devis ${quote.quoteNumber}`,
        content: contractContent,
        status: "draft",
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      contractId: contract.id.toString(),
      message: "Contrat créé avec succès",
    })
  } catch (error) {
    console.error("Error generating contract from quote:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la génération du contrat" },
      { status: 500 }
    )
  }
}

// GET: Check if a contract exists for this quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const quoteId = BigInt(id)

    const contract = await prisma.contract.findFirst({
      where: { quoteId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      hasContract: !!contract,
      contract: contract ? {
        id: contract.id.toString(),
        title: contract.title,
        status: contract.status,
        createdAt: contract.createdAt,
      } : null,
    })
  } catch (error) {
    console.error("Error checking contract for quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}
