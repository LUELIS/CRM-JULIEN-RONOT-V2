import { prisma } from "./prisma"

export type NotificationType =
  | "payment"
  | "invoice"
  | "quote"
  | "client"
  | "ticket"
  | "subscription"
  | "system"

interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  link?: string
  entityType?: string
  entityId?: bigint | string
  userId?: bigint | string
  tenantId?: bigint
}

export async function createNotification({
  type,
  title,
  message,
  link,
  entityType,
  entityId,
  userId,
  tenantId = BigInt(1),
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        tenant_id: tenantId,
        userId: userId ? BigInt(userId.toString()) : null,
        type: type as never,
        title,
        message,
        link,
        entityType,
        entityId: entityId ? BigInt(entityId.toString()) : null,
      },
    })
    return notification
  } catch (error) {
    console.error("Error creating notification:", error)
    return null
  }
}

// Helper functions for common notifications
export async function notifyInvoicePaid(
  invoiceNumber: string,
  clientName: string,
  amount: string,
  invoiceId: string
) {
  return createNotification({
    type: "payment",
    title: "Paiement recu",
    message: `${clientName} a paye la facture ${invoiceNumber} (${amount})`,
    link: `/invoices/${invoiceId}`,
    entityType: "invoice",
    entityId: invoiceId,
  })
}

export async function notifyInvoiceOverdue(
  invoiceNumber: string,
  clientName: string,
  daysOverdue: number,
  invoiceId: string
) {
  return createNotification({
    type: "invoice",
    title: "Facture en retard",
    message: `La facture ${invoiceNumber} de ${clientName} est en retard de ${daysOverdue} jour${daysOverdue > 1 ? "s" : ""}`,
    link: `/invoices/${invoiceId}`,
    entityType: "invoice",
    entityId: invoiceId,
  })
}

export async function notifyNewClient(
  clientName: string,
  clientId: string
) {
  return createNotification({
    type: "client",
    title: "Nouveau client",
    message: `${clientName} a ete ajoute`,
    link: `/clients/${clientId}`,
    entityType: "client",
    entityId: clientId,
  })
}

export async function notifyNewTicket(
  ticketSubject: string,
  clientName: string,
  ticketId: string
) {
  return createNotification({
    type: "ticket",
    title: "Nouveau ticket",
    message: `${clientName}: ${ticketSubject}`,
    link: `/tickets/${ticketId}`,
    entityType: "ticket",
    entityId: ticketId,
  })
}

export async function notifyQuoteAccepted(
  quoteNumber: string,
  clientName: string,
  quoteId: string
) {
  return createNotification({
    type: "quote",
    title: "Devis accepte",
    message: `${clientName} a accepte le devis ${quoteNumber}`,
    link: `/quotes/${quoteId}`,
    entityType: "quote",
    entityId: quoteId,
  })
}

export async function notifySubscriptionExpiring(
  subscriptionName: string,
  clientName: string,
  daysLeft: number,
  subscriptionId: string
) {
  return createNotification({
    type: "subscription",
    title: "Abonnement expire bientot",
    message: `L'abonnement ${subscriptionName} de ${clientName} expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`,
    link: `/subscriptions/${subscriptionId}`,
    entityType: "subscription",
    entityId: subscriptionId,
  })
}
