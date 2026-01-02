import { prisma } from "@/lib/prisma"

/**
 * Convertit automatiquement un client prospect en client actif
 * si son statut actuel est "prospect"
 *
 * @param clientId - L'ID du client à convertir
 * @returns true si le client a été converti, false sinon
 */
export async function convertProspectToClient(clientId: bigint): Promise<boolean> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, status: true },
    })

    if (!client) {
      console.warn(`convertProspectToClient: Client ${clientId} not found`)
      return false
    }

    // Ne convertir que si le client est actuellement un prospect
    if (client.status !== "prospect") {
      return false
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { status: "active" },
    })

    console.log(`Client ${clientId} converted from prospect to active`)
    return true
  } catch (error) {
    console.error(`Error converting prospect to client:`, error)
    return false
  }
}

/**
 * Vérifie si un client devrait être converti en fonction de ses devis/factures
 * et effectue la conversion si nécessaire
 *
 * @param clientId - L'ID du client à vérifier
 * @returns true si le client a été converti, false sinon
 */
export async function checkAndConvertProspect(clientId: bigint): Promise<boolean> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        status: true,
        quotes: {
          where: { status: "accepted" },
          select: { id: true },
          take: 1,
        },
        invoices: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!client) {
      return false
    }

    // Ne convertir que si le client est actuellement un prospect
    if (client.status !== "prospect") {
      return false
    }

    // Convertir si le client a au moins un devis accepté OU au moins une facture
    const hasAcceptedQuote = client.quotes.length > 0
    const hasInvoice = client.invoices.length > 0

    if (hasAcceptedQuote || hasInvoice) {
      await prisma.client.update({
        where: { id: clientId },
        data: { status: "active" },
      })

      console.log(`Client ${clientId} auto-converted from prospect to active (quote: ${hasAcceptedQuote}, invoice: ${hasInvoice})`)
      return true
    }

    return false
  } catch (error) {
    console.error(`Error checking and converting prospect:`, error)
    return false
  }
}
