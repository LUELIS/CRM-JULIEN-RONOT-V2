#!/usr/bin/env node
/**
 * CRM Telegram Bot
 *
 * Bot Telegram pour interagir avec le CRM via des commandes.
 * Utilise les mêmes handlers que le MCP Server.
 */

import { Bot, Context, session, SessionFlavor, InlineKeyboard } from "grammy"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const ALLOWED_USERS = (process.env.TELEGRAM_ALLOWED_USERS || "").split(",").map((id) => parseInt(id.trim()))
const DEFAULT_TENANT_ID = BigInt(process.env.CRM_TENANT_ID || "1")
const DEFAULT_USER_ID = BigInt(process.env.CRM_USER_ID || "1")

// Session data type
interface SessionData {
  awaitingInput?: string
  context?: Record<string, unknown>
  lastClientId?: number
  lastQuoteId?: number
  lastNoteId?: number
}

type MyContext = Context & SessionFlavor<SessionData>

// ============================================
// BOT SETUP
// ============================================

const bot = new Bot<MyContext>(BOT_TOKEN)

// Session middleware
bot.use(
  session({
    initial: (): SessionData => ({}),
  })
)

// Auth middleware - only allowed users
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId || (ALLOWED_USERS.length > 0 && ALLOWED_USERS[0] !== 0 && !ALLOWED_USERS.includes(userId))) {
    await ctx.reply("Accès non autorisé. Contactez l'administrateur.")
    return
  }
  await next()
})

// ============================================
// COMMAND HANDLERS
// ============================================

// /start - Welcome message
bot.command("start", async (ctx) => {
  await ctx.reply(
    `Bienvenue sur le CRM Bot!\n\n` +
      `Commandes disponibles:\n\n` +
      `**Clients:**\n` +
      `/client <nom> - Créer un client\n` +
      `/clients - Lister les clients\n` +
      `/chercher <terme> - Rechercher un client\n\n` +
      `**Notes:**\n` +
      `/note <contenu> - Créer une note\n` +
      `/note @<client> <contenu> - Note liée à un client\n` +
      `/notes - Lister les notes récentes\n` +
      `/rappels - Voir les rappels à venir\n\n` +
      `**Tâches:**\n` +
      `/tache <titre> - Créer une tâche\n` +
      `/taches - Lister les tâches\n` +
      `/fait <id> - Marquer une tâche terminée\n\n` +
      `**Devis:**\n` +
      `/devis - Créer un devis (assistant)\n` +
      `/devis_liste - Lister les devis\n\n` +
      `**Stats:**\n` +
      `/stats - Statistiques du mois\n` +
      `/stats today|week|month|year - Par période`,
    { parse_mode: "Markdown" }
  )
})

// /help
bot.command("help", async (ctx) => {
  await ctx.reply(
    `**Aide CRM Bot**\n\n` +
      `Ce bot vous permet de gérer votre CRM directement depuis Telegram.\n\n` +
      `**Astuces:**\n` +
      `- Utilisez @nom_client pour lier une note à un client\n` +
      `- Les dates acceptent le format: 25/01, 25/01/2026, demain, lundi\n` +
      `- Priorités: !urgent, !high, !low\n\n` +
      `Tapez /start pour voir toutes les commandes.`,
    { parse_mode: "Markdown" }
  )
})

// ============================================
// CLIENTS
// ============================================

// /client <nom> - Créer un client
bot.command("client", async (ctx) => {
  const args = ctx.match?.trim()
  if (!args) {
    await ctx.reply("Usage: /client <nom de la société>")
    return
  }

  try {
    const client = await prisma.client.create({
      data: {
        tenant_id: DEFAULT_TENANT_ID,
        companyName: args,
        status: "prospect",
      },
    })

    ctx.session.lastClientId = Number(client.id)

    const keyboard = new InlineKeyboard()
      .text("Ajouter email", `client_email_${client.id}`)
      .text("Ajouter téléphone", `client_phone_${client.id}`)
      .row()
      .text("Ajouter note", `client_note_${client.id}`)
      .text("Créer devis", `client_quote_${client.id}`)

    await ctx.reply(
      `Client créé!\n\n` +
        `**${client.companyName}**\n` +
        `ID: ${client.id}\n` +
        `Statut: ${client.status}`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    )
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// /clients - Lister les clients
bot.command("clients", async (ctx) => {
  try {
    const clients = await prisma.client.findMany({
      where: { tenant_id: DEFAULT_TENANT_ID },
      take: 15,
      orderBy: { createdAt: "desc" },
    })

    if (clients.length === 0) {
      await ctx.reply("Aucun client trouvé.")
      return
    }

    const list = clients
      .map((c, i) => `${i + 1}. **${c.companyName}** (${c.status}) - ID: ${c.id}`)
      .join("\n")

    await ctx.reply(`**Derniers clients:**\n\n${list}`, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// /chercher <terme> - Rechercher
bot.command("chercher", async (ctx) => {
  const query = ctx.match?.trim()
  if (!query) {
    await ctx.reply("Usage: /chercher <terme>")
    return
  }

  try {
    const clients = await prisma.client.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        OR: [
          { companyName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      take: 10,
    })

    if (clients.length === 0) {
      await ctx.reply(`Aucun résultat pour "${query}"`)
      return
    }

    const list = clients
      .map((c) => {
        const contact = c.email || c.phone || ""
        return `**${c.companyName}**\n   ${contact} - ID: ${c.id}`
      })
      .join("\n\n")

    await ctx.reply(`**Résultats pour "${query}":**\n\n${list}`, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// ============================================
// NOTES
// ============================================

// /note [contenu] - Créer une note
bot.command("note", async (ctx) => {
  let content = ctx.match?.trim()
  if (!content) {
    await ctx.reply("Usage: /note <contenu>\n\nPour lier à un client: /note @NomClient Ma note")
    return
  }

  try {
    // Extraire le client mentionné (@NomClient)
    const clientMatch = content.match(/@(\S+)/)
    let clientId: bigint | undefined

    if (clientMatch) {
      const clientName = clientMatch[1]
      const client = await prisma.client.findFirst({
        where: {
          tenant_id: DEFAULT_TENANT_ID,
          companyName: { contains: clientName },
        },
      })
      if (client) {
        clientId = client.id
        content = content.replace(/@\S+/, "").trim()
      }
    }

    // Extraire la date de rappel (#demain, #25/01)
    let reminderAt: Date | undefined
    const dateMatch = content.match(/#(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/)
    if (dateMatch) {
      reminderAt = parseDate(dateMatch[1])
      content = content.replace(/#\S+/, "").trim()
    }

    // Extraire le type (!todo, !meeting, !call)
    let type: "note" | "todo" | "reminder" | "meeting" | "call" | "email" = "note"
    const typeMatch = content.match(/!(todo|meeting|call|email|reminder)/)
    if (typeMatch) {
      type = typeMatch[1] as typeof type
      content = content.replace(/!\S+/, "").trim()
    }

    const note = await prisma.note.create({
      data: {
        tenant_id: DEFAULT_TENANT_ID,
        createdBy: DEFAULT_USER_ID,
        content,
        type,
        reminderAt,
      },
    })

    // Lier au client
    if (clientId) {
      await prisma.noteEntityLink.create({
        data: {
          noteId: note.id,
          entityType: "client",
          entityId: clientId,
        },
      })
    }

    ctx.session.lastNoteId = Number(note.id)

    let message = `Note créée!\n\nType: ${type}`
    if (clientId) message += `\nClient: lié`
    if (reminderAt) message += `\nRappel: ${reminderAt.toLocaleDateString("fr-FR")}`

    await ctx.reply(message)
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// /notes - Lister les notes
bot.command("notes", async (ctx) => {
  try {
    const notes = await prisma.note.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        isArchived: false,
        isRecycle: false,
      },
      include: {
        entityLinks: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    })

    if (notes.length === 0) {
      await ctx.reply("Aucune note récente.")
      return
    }

    const list = notes
      .map((n) => {
        const preview = n.content.substring(0, 80) + (n.content.length > 80 ? "..." : "")
        const linked = n.entityLinks.length > 0 ? " [lié]" : ""
        return `[${n.type}]${linked} ${preview}`
      })
      .join("\n\n")

    await ctx.reply(`**Notes récentes:**\n\n${list}`, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// /rappels - Rappels à venir
bot.command("rappels", async (ctx) => {
  try {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)

    const notes = await prisma.note.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        isArchived: false,
        reminderAt: {
          gte: new Date(),
          lte: endDate,
        },
        reminderSent: false,
      },
      orderBy: { reminderAt: "asc" },
    })

    if (notes.length === 0) {
      await ctx.reply("Aucun rappel dans les 7 prochains jours.")
      return
    }

    const list = notes
      .map((n) => {
        const date = n.reminderAt!.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
        const preview = n.content.substring(0, 60)
        return `**${date}:** ${preview}`
      })
      .join("\n\n")

    await ctx.reply(`**Rappels à venir:**\n\n${list}`, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// ============================================
// TASKS
// ============================================

// /tache <titre> - Créer une tâche
bot.command("tache", async (ctx) => {
  let title = ctx.match?.trim()
  if (!title) {
    await ctx.reply("Usage: /tache <titre>\n\nOptions: @Client, #date, !priorité")
    return
  }

  try {
    // Extraire le client
    const clientMatch = title.match(/@(\S+)/)
    let clientId: bigint | undefined

    if (clientMatch) {
      const client = await prisma.client.findFirst({
        where: {
          tenant_id: DEFAULT_TENANT_ID,
          companyName: { contains: clientMatch[1] },
        },
      })
      if (client) clientId = client.id
      title = title.replace(/@\S+/, "").trim()
    }

    // Extraire la date
    let dueDate: Date | undefined
    const dateMatch = title.match(/#(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/)
    if (dateMatch) {
      dueDate = parseDate(dateMatch[1])
      title = title.replace(/#\S+/, "").trim()
    }

    // Extraire la priorité
    let priority: "low" | "medium" | "high" | "urgent" = "medium"
    const priorityMatch = title.match(/!(urgent|high|low)/)
    if (priorityMatch) {
      priority = priorityMatch[1] as typeof priority
      title = title.replace(/!\S+/, "").trim()
    }

    // Trouver ou créer le projet "Général"
    let project = await prisma.project.findFirst({ where: { name: "Général" } })
    if (!project) {
      project = await prisma.project.create({
        data: { name: "Général", description: "Tâches générales" },
      })
    }

    // Trouver ou créer la colonne "À faire"
    let column = await prisma.projectColumn.findFirst({
      where: { projectId: project.id, name: "À faire" },
    })
    if (!column) {
      column = await prisma.projectColumn.create({
        data: { projectId: project.id, name: "À faire", position: 0 },
      })
    }

    const task = await prisma.projectCard.create({
      data: {
        columnId: column.id,
        title,
        priority,
        dueDate,
        clientId,
        position: 0,
      },
    })

    let message = `Tâche créée!\n\n**${title}**\nID: ${task.id}`
    if (priority !== "medium") message += `\nPriorité: ${priority}`
    if (dueDate) message += `\nÉchéance: ${dueDate.toLocaleDateString("fr-FR")}`

    await ctx.reply(message, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// /taches - Lister les tâches
bot.command("taches", async (ctx) => {
  try {
    const tasks = await prisma.projectCard.findMany({
      where: { isCompleted: false },
      include: {
        client: true,
        column: { include: { project: true } },
      },
      take: 15,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    })

    if (tasks.length === 0) {
      await ctx.reply("Aucune tâche en cours!")
      return
    }

    const list = tasks
      .map((t) => {
        const due = t.dueDate ? ` (${t.dueDate.toLocaleDateString("fr-FR")})` : ""
        const pri = t.priority !== "medium" ? ` [${t.priority}]` : ""
        const client = t.client ? ` @${t.client.companyName}` : ""
        return `${t.id}. **${t.title}**${pri}${due}${client}`
      })
      .join("\n")

    await ctx.reply(`**Tâches en cours:**\n\n${list}`, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// /fait <id> - Marquer terminé
bot.command("fait", async (ctx) => {
  const id = parseInt(ctx.match?.trim() || "")
  if (!id) {
    await ctx.reply("Usage: /fait <id de la tâche>")
    return
  }

  try {
    const task = await prisma.projectCard.update({
      where: { id: BigInt(id) },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    })

    await ctx.reply(`Tâche "${task.title}" marquée comme terminée!`)
  } catch (error) {
    await ctx.reply(`Erreur: Tâche non trouvée ou ${error instanceof Error ? error.message : "erreur"}`)
  }
})

// ============================================
// QUOTES (Devis)
// ============================================

// /devis - Assistant de création de devis
bot.command("devis", async (ctx) => {
  ctx.session.awaitingInput = "quote_client"
  ctx.session.context = {}
  await ctx.reply(
    "**Création de devis**\n\n" +
      "Étape 1/3: Quel est le client?\n" +
      "Entrez le nom du client ou son ID:",
    { parse_mode: "Markdown" }
  )
})

// /devis_liste - Lister les devis
bot.command("devis_liste", async (ctx) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: { tenant_id: DEFAULT_TENANT_ID },
      include: { client: true },
      take: 15,
      orderBy: { createdAt: "desc" },
    })

    if (quotes.length === 0) {
      await ctx.reply("Aucun devis trouvé.")
      return
    }

    const list = quotes
      .map((q) => {
        const status = q.status === "draft" ? "Brouillon" : q.status
        return `**${q.quoteNumber}** - ${q.client.companyName}\n   ${Number(q.totalWithTax).toFixed(2)}€ TTC - ${status}`
      })
      .join("\n\n")

    await ctx.reply(`**Derniers devis:**\n\n${list}`, { parse_mode: "Markdown" })
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// ============================================
// STATS
// ============================================

// /stats [period]
bot.command("stats", async (ctx) => {
  try {
    const period = (ctx.match?.trim() || "month") as "today" | "week" | "month" | "year"
    const now = new Date()
    let startDate: Date

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "week":
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const [clients, invoices, quotes, tasks] = await Promise.all([
      prisma.client.count({
        where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
      }),
      prisma.invoice.aggregate({
        where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
        _count: true,
        _sum: { totalWithTax: true },
      }),
      prisma.quote.aggregate({
        where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
        _count: true,
        _sum: { totalWithTax: true },
      }),
      prisma.projectCard.count({
        where: { createdAt: { gte: startDate }, isCompleted: true },
      }),
    ])

    const periodLabels = {
      today: "Aujourd'hui",
      week: "Cette semaine",
      month: "Ce mois",
      year: "Cette année",
    }

    await ctx.reply(
      `**Stats - ${periodLabels[period]}**\n\n` +
        `Nouveaux clients: ${clients}\n` +
        `Factures: ${invoices._count} (${Number(invoices._sum.totalWithTax || 0).toFixed(2)}€)\n` +
        `Devis: ${quotes._count} (${Number(quotes._sum.totalWithTax || 0).toFixed(2)}€)\n` +
        `Tâches terminées: ${tasks}`,
      { parse_mode: "Markdown" }
    )
  } catch (error) {
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

// ============================================
// MESSAGE HANDLER (for conversational flow)
// ============================================

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text

  // Handle quote creation flow
  if (ctx.session.awaitingInput === "quote_client") {
    const client = await prisma.client.findFirst({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        OR: [
          { id: isNaN(parseInt(text)) ? undefined : BigInt(parseInt(text)) },
          { companyName: { contains: text } },
        ],
      },
    })

    if (!client) {
      await ctx.reply("Client non trouvé. Essayez avec un autre nom ou ID:")
      return
    }

    ctx.session.context = { ...ctx.session.context, clientId: Number(client.id), clientName: client.companyName }
    ctx.session.awaitingInput = "quote_items"
    await ctx.reply(
      `Client: **${client.companyName}**\n\n` +
        `Étape 2/3: Lignes du devis\n` +
        `Format: description | quantité | prix unitaire HT\n\n` +
        `Exemple:\n` +
        `Développement site web | 1 | 5000\n` +
        `Maintenance mensuelle | 12 | 200\n\n` +
        `Envoyez les lignes:`,
      { parse_mode: "Markdown" }
    )
    return
  }

  if (ctx.session.awaitingInput === "quote_items") {
    const lines = text.split("\n").filter((l) => l.trim())
    const items: Array<{ description: string; quantity: number; unitPrice: number }> = []

    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim())
      if (parts.length >= 3) {
        items.push({
          description: parts[0],
          quantity: parseFloat(parts[1]) || 1,
          unitPrice: parseFloat(parts[2]) || 0,
        })
      }
    }

    if (items.length === 0) {
      await ctx.reply("Format invalide. Réessayez avec: description | quantité | prix")
      return
    }

    ctx.session.context = { ...ctx.session.context, items }
    ctx.session.awaitingInput = "quote_confirm"

    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    const totalTTC = total * 1.2

    const preview = items.map((i) => `- ${i.description}: ${i.quantity} x ${i.unitPrice}€`).join("\n")

    const keyboard = new InlineKeyboard()
      .text("Confirmer", "quote_confirm")
      .text("Annuler", "quote_cancel")

    await ctx.reply(
      `**Récapitulatif du devis:**\n\n` +
        `Client: ${ctx.session.context.clientName}\n\n` +
        `${preview}\n\n` +
        `**Total HT: ${total.toFixed(2)}€**\n` +
        `**Total TTC: ${totalTTC.toFixed(2)}€**\n\n` +
        `Confirmer?`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    )
    return
  }

  // Natural language fallback
  await ctx.reply(
    "Je n'ai pas compris. Utilisez une commande comme /help pour voir les options disponibles."
  )
})

// ============================================
// CALLBACK HANDLERS
// ============================================

bot.callbackQuery("quote_confirm", async (ctx) => {
  const context = ctx.session.context
  if (!context?.clientId || !context?.items) {
    await ctx.answerCallbackQuery("Session expirée")
    return
  }

  try {
    const items = context.items as Array<{ description: string; quantity: number; unitPrice: number }>

    // Generate quote number
    const year = new Date().getFullYear()
    const lastQuote = await prisma.quote.findFirst({
      where: { tenant_id: DEFAULT_TENANT_ID, quoteNumber: { startsWith: `DEV-${year}-` } },
      orderBy: { quoteNumber: "desc" },
    })
    const nextNum = lastQuote ? parseInt(lastQuote.quoteNumber.split("-")[2]) + 1 : 1
    const quoteNumber = `DEV-${year}-${String(nextNum).padStart(4, "0")}`

    let totalHT = 0
    let totalVAT = 0
    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice
      totalHT += lineTotal
      totalVAT += lineTotal * 0.2
    }

    const quote = await prisma.quote.create({
      data: {
        tenant_id: DEFAULT_TENANT_ID,
        clientId: BigInt(context.clientId as number),
        quoteNumber,
        subject: "Devis",
        status: "draft",
        totalAmount: totalHT,
        vatAmount: totalVAT,
        totalWithTax: totalHT + totalVAT,
        items: {
          create: items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: 20,
            totalPrice: item.quantity * item.unitPrice,
            position: index + 1,
          })),
        },
      },
    })

    ctx.session.awaitingInput = undefined
    ctx.session.context = {}
    ctx.session.lastQuoteId = Number(quote.id)

    await ctx.answerCallbackQuery("Devis créé!")
    await ctx.editMessageText(
      `**Devis créé!**\n\n` +
        `Numéro: ${quoteNumber}\n` +
        `Total TTC: ${(totalHT + totalVAT).toFixed(2)}€`,
      { parse_mode: "Markdown" }
    )
  } catch (error) {
    await ctx.answerCallbackQuery("Erreur lors de la création")
    await ctx.reply(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
})

bot.callbackQuery("quote_cancel", async (ctx) => {
  ctx.session.awaitingInput = undefined
  ctx.session.context = {}
  await ctx.answerCallbackQuery("Annulé")
  await ctx.editMessageText("Création de devis annulée.")
})

// Handle client actions
bot.callbackQuery(/^client_(\w+)_(\d+)$/, async (ctx) => {
  const action = ctx.match![1]
  const clientId = ctx.match![2]

  ctx.session.lastClientId = parseInt(clientId)

  switch (action) {
    case "email":
      ctx.session.awaitingInput = "client_email"
      await ctx.answerCallbackQuery()
      await ctx.reply("Entrez l'email du client:")
      break
    case "phone":
      ctx.session.awaitingInput = "client_phone"
      await ctx.answerCallbackQuery()
      await ctx.reply("Entrez le téléphone du client:")
      break
    case "note":
      ctx.session.awaitingInput = "client_note"
      await ctx.answerCallbackQuery()
      await ctx.reply("Entrez la note:")
      break
    case "quote":
      ctx.session.awaitingInput = "quote_items"
      const client = await prisma.client.findUnique({ where: { id: BigInt(clientId) } })
      ctx.session.context = { clientId: parseInt(clientId), clientName: client?.companyName }
      await ctx.answerCallbackQuery()
      await ctx.reply(
        `Créer un devis pour ${client?.companyName}\n\n` +
          `Format: description | quantité | prix unitaire HT\n\n` +
          `Exemple:\n` +
          `Développement | 1 | 5000`
      )
      break
  }
})

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseDate(input: string): Date {
  const now = new Date()

  // demain
  if (input === "demain") {
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    return date
  }

  // jours de la semaine
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const dayIndex = days.indexOf(input.toLowerCase())
  if (dayIndex !== -1) {
    const date = new Date(now)
    const currentDay = date.getDay()
    const daysUntil = (dayIndex - currentDay + 7) % 7 || 7
    date.setDate(date.getDate() + daysUntil)
    return date
  }

  // format DD/MM ou DD/MM/YYYY
  const dateParts = input.split("/")
  if (dateParts.length >= 2) {
    const day = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1
    const year = dateParts[2] ? parseInt(dateParts[2]) : now.getFullYear()
    return new Date(year < 100 ? 2000 + year : year, month, day)
  }

  return now
}

// ============================================
// START BOT
// ============================================

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required")
  process.exit(1)
}

console.log("Starting CRM Telegram Bot...")
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot started: @${botInfo.username}`)
  },
})
