#!/usr/bin/env node
/**
 * CRM MCP Server
 *
 * Expose les fonctionnalités du CRM via le protocole MCP.
 * Peut être utilisé par Claude Code ou un bot Telegram.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Default tenant ID (à personnaliser selon le contexte)
const DEFAULT_TENANT_ID = 1n
const DEFAULT_USER_ID = 1n

// ============================================
// TOOL DEFINITIONS
// ============================================

const tools: z.infer<typeof ToolSchema>[] = [
  // ============================================
  // CLIENTS
  // ============================================
  {
    name: "create_client",
    description: "Créer un nouveau client dans le CRM",
    inputSchema: {
      type: "object",
      properties: {
        companyName: { type: "string", description: "Nom de la société" },
        email: { type: "string", description: "Email du client" },
        phone: { type: "string", description: "Téléphone" },
        address: { type: "string", description: "Adresse" },
        city: { type: "string", description: "Ville" },
        postalCode: { type: "string", description: "Code postal" },
        contactFirstname: { type: "string", description: "Prénom du contact" },
        contactLastname: { type: "string", description: "Nom du contact" },
        notes: { type: "string", description: "Notes sur le client" },
        status: {
          type: "string",
          enum: ["prospect", "active", "inactive", "archived"],
          description: "Statut du client"
        },
      },
      required: ["companyName"],
    },
  },
  {
    name: "search_clients",
    description: "Rechercher des clients par nom, email ou téléphone",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Terme de recherche" },
        limit: { type: "number", description: "Nombre max de résultats (défaut: 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_client",
    description: "Récupérer les détails d'un client par son ID ou nom",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "ID du client" },
        name: { type: "string", description: "Nom du client (recherche partielle)" },
      },
    },
  },
  {
    name: "list_clients",
    description: "Lister les clients récents",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filtrer par statut" },
        limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
      },
    },
  },

  // ============================================
  // NOTES
  // ============================================
  {
    name: "create_note",
    description: "Créer une note, optionnellement liée à un client ou autre entité",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Contenu de la note (markdown supporté)" },
        type: {
          type: "string",
          enum: ["note", "todo", "reminder", "meeting", "call", "email"],
          description: "Type de note"
        },
        clientId: { type: "number", description: "ID du client à associer" },
        clientName: { type: "string", description: "Nom du client à associer (recherche)" },
        reminderAt: { type: "string", description: "Date de rappel (ISO 8601)" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags à associer"
        },
      },
      required: ["content"],
    },
  },
  {
    name: "search_notes",
    description: "Rechercher dans les notes",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Terme de recherche" },
        clientId: { type: "number", description: "Filtrer par client" },
        type: { type: "string", description: "Filtrer par type" },
        limit: { type: "number", description: "Nombre max de résultats" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_notes",
    description: "Lister les notes récentes ou par client",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "number", description: "Filtrer par client" },
        clientName: { type: "string", description: "Filtrer par nom de client" },
        type: { type: "string", description: "Filtrer par type" },
        limit: { type: "number", description: "Nombre max de résultats (défaut: 20)" },
      },
    },
  },
  {
    name: "get_reminders",
    description: "Récupérer les rappels à venir",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Nombre de jours à l'avance (défaut: 7)" },
      },
    },
  },

  // ============================================
  // TASKS (ProjectCard / Subtasks)
  // ============================================
  {
    name: "create_task",
    description: "Créer une tâche (carte de projet)",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre de la tâche" },
        description: { type: "string", description: "Description détaillée" },
        projectId: { type: "number", description: "ID du projet" },
        projectName: { type: "string", description: "Nom du projet (recherche)" },
        clientId: { type: "number", description: "Client associé" },
        clientName: { type: "string", description: "Nom du client (recherche)" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priorité"
        },
        dueDate: { type: "string", description: "Date d'échéance (ISO 8601)" },
        columnName: { type: "string", description: "Nom de la colonne (défaut: À faire)" },
      },
      required: ["title"],
    },
  },
  {
    name: "create_subtask",
    description: "Créer une sous-tâche",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "number", description: "ID de la tâche parente" },
        title: { type: "string", description: "Titre de la sous-tâche" },
        dueDate: { type: "string", description: "Date d'échéance" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      },
      required: ["taskId", "title"],
    },
  },
  {
    name: "list_tasks",
    description: "Lister les tâches",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Filtrer par projet" },
        clientId: { type: "number", description: "Filtrer par client" },
        status: { type: "string", enum: ["pending", "completed", "all"], description: "Statut" },
        priority: { type: "string", description: "Filtrer par priorité" },
        limit: { type: "number", description: "Nombre max (défaut: 20)" },
      },
    },
  },
  {
    name: "complete_task",
    description: "Marquer une tâche comme terminée",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "number", description: "ID de la tâche" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "complete_subtask",
    description: "Marquer une sous-tâche comme terminée",
    inputSchema: {
      type: "object",
      properties: {
        subtaskId: { type: "number", description: "ID de la sous-tâche" },
      },
      required: ["subtaskId"],
    },
  },

  // ============================================
  // QUOTES (Devis)
  // ============================================
  {
    name: "create_quote",
    description: "Créer un devis",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "number", description: "ID du client" },
        clientName: { type: "string", description: "Nom du client (recherche)" },
        subject: { type: "string", description: "Objet du devis" },
        items: {
          type: "array",
          description: "Lignes du devis",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              vatRate: { type: "number", description: "Taux TVA (défaut: 20)" },
            },
            required: ["description", "quantity", "unitPrice"],
          },
        },
        notes: { type: "string", description: "Notes/conditions" },
        validUntil: { type: "string", description: "Date de validité (ISO 8601)" },
      },
      required: ["items"],
    },
  },
  {
    name: "list_quotes",
    description: "Lister les devis",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "number", description: "Filtrer par client" },
        status: { type: "string", enum: ["draft", "sent", "accepted", "rejected", "expired"] },
        limit: { type: "number", description: "Nombre max (défaut: 20)" },
      },
    },
  },
  {
    name: "search_quotes",
    description: "Rechercher des devis",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Terme de recherche" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },

  // ============================================
  // STATS
  // ============================================
  {
    name: "get_stats",
    description: "Récupérer les statistiques du CRM",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "year"], description: "Période" },
      },
    },
  },
]

// ============================================
// TOOL HANDLERS
// ============================================

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      // ============================================
      // CLIENTS
      // ============================================
      case "create_client": {
        const client = await prisma.client.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            companyName: args.companyName as string,
            email: args.email as string | undefined,
            phone: args.phone as string | undefined,
            address: args.address as string | undefined,
            city: args.city as string | undefined,
            postalCode: args.postalCode as string | undefined,
            contactFirstname: args.contactFirstname as string | undefined,
            contactLastname: args.contactLastname as string | undefined,
            notes: args.notes as string | undefined,
            status: (args.status as "prospect" | "active" | "inactive" | "archived") || "prospect",
          },
        })
        return JSON.stringify({
          success: true,
          message: `Client "${client.companyName}" créé avec succès`,
          client: {
            id: Number(client.id),
            companyName: client.companyName,
            email: client.email,
            status: client.status,
          },
        })
      }

      case "search_clients": {
        const query = args.query as string
        const limit = (args.limit as number) || 10
        const clients = await prisma.client.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            OR: [
              { companyName: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
              { contactFirstname: { contains: query } },
              { contactLastname: { contains: query } },
            ],
          },
          take: limit,
          orderBy: { companyName: "asc" },
        })
        return JSON.stringify({
          count: clients.length,
          clients: clients.map((c) => ({
            id: Number(c.id),
            companyName: c.companyName,
            email: c.email,
            phone: c.phone,
            status: c.status,
            contact: c.contactFirstname ? `${c.contactFirstname} ${c.contactLastname || ""}`.trim() : null,
          })),
        })
      }

      case "get_client": {
        let client
        if (args.id) {
          client = await prisma.client.findFirst({
            where: { id: BigInt(args.id as number), tenant_id: DEFAULT_TENANT_ID },
            include: {
              invoices: { take: 5, orderBy: { createdAt: "desc" } },
              quotes: { take: 5, orderBy: { createdAt: "desc" } },
              subscriptions: { where: { status: "active" } },
            },
          })
        } else if (args.name) {
          client = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: args.name as string }
            },
            include: {
              invoices: { take: 5, orderBy: { createdAt: "desc" } },
              quotes: { take: 5, orderBy: { createdAt: "desc" } },
              subscriptions: { where: { status: "active" } },
            },
          })
        }
        if (!client) return JSON.stringify({ error: "Client non trouvé" })

        return JSON.stringify({
          id: Number(client.id),
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          postalCode: client.postalCode,
          status: client.status,
          contact: {
            firstname: client.contactFirstname,
            lastname: client.contactLastname,
            email: client.contactEmail,
            phone: client.contactPhone,
          },
          stats: {
            invoices: client.invoices.length,
            quotes: client.quotes.length,
            activeSubscriptions: client.subscriptions.length,
          },
        })
      }

      case "list_clients": {
        const limit = (args.limit as number) || 20
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status

        const clients = await prisma.client.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
        })
        return JSON.stringify({
          count: clients.length,
          clients: clients.map((c) => ({
            id: Number(c.id),
            companyName: c.companyName,
            email: c.email,
            status: c.status,
          })),
        })
      }

      // ============================================
      // NOTES
      // ============================================
      case "create_note": {
        // Trouver le client si spécifié par nom
        let clientId: bigint | undefined
        if (args.clientId) {
          clientId = BigInt(args.clientId as number)
        } else if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: args.clientName as string }
            },
          })
          if (client) clientId = client.id
        }

        const note = await prisma.note.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            createdBy: DEFAULT_USER_ID,
            content: args.content as string,
            type: (args.type as "note" | "todo" | "reminder" | "meeting" | "call" | "email") || "note",
            reminderAt: args.reminderAt ? new Date(args.reminderAt as string) : undefined,
          },
        })

        // Lier au client si spécifié
        if (clientId) {
          await prisma.noteEntityLink.create({
            data: {
              noteId: note.id,
              entityType: "client",
              entityId: clientId,
            },
          })
        }

        // Ajouter les tags si spécifiés
        if (args.tags && Array.isArray(args.tags)) {
          for (const tagName of args.tags as string[]) {
            // Créer ou récupérer le tag
            let tag = await prisma.noteTagDefinition.findFirst({
              where: { tenant_id: DEFAULT_TENANT_ID, name: tagName },
            })
            if (!tag) {
              tag = await prisma.noteTagDefinition.create({
                data: { tenant_id: DEFAULT_TENANT_ID, name: tagName },
              })
            }
            await prisma.noteTag.create({
              data: { noteId: note.id, tagId: tag.id },
            })
          }
        }

        return JSON.stringify({
          success: true,
          message: "Note créée avec succès",
          note: {
            id: Number(note.id),
            type: note.type,
            linkedToClient: !!clientId,
            hasReminder: !!note.reminderAt,
          },
        })
      }

      case "search_notes": {
        const query = args.query as string
        const limit = (args.limit as number) || 20

        const notes = await prisma.note.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            isArchived: false,
            isRecycle: false,
            content: { contains: query },
            ...(args.type && { type: args.type as string }),
            ...(args.clientId && {
              entityLinks: {
                some: {
                  entityType: "client",
                  entityId: BigInt(args.clientId as number),
                },
              },
            }),
          },
          include: {
            entityLinks: true,
            tags: { include: { tag: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        })

        return JSON.stringify({
          count: notes.length,
          notes: notes.map((n) => ({
            id: Number(n.id),
            content: n.content.substring(0, 200) + (n.content.length > 200 ? "..." : ""),
            type: n.type,
            createdAt: n.createdAt.toISOString(),
            tags: n.tags.map((t) => t.tag.name),
            linkedEntities: n.entityLinks.map((l) => ({ type: l.entityType, id: Number(l.entityId) })),
          })),
        })
      }

      case "list_notes": {
        const limit = (args.limit as number) || 20
        let clientId: bigint | undefined

        if (args.clientId) {
          clientId = BigInt(args.clientId as number)
        } else if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: args.clientName as string }
            },
          })
          if (client) clientId = client.id
        }

        const notes = await prisma.note.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            isArchived: false,
            isRecycle: false,
            ...(args.type && { type: args.type as string }),
            ...(clientId && {
              entityLinks: {
                some: {
                  entityType: "client",
                  entityId: clientId,
                },
              },
            }),
          },
          include: {
            entityLinks: true,
            tags: { include: { tag: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        })

        return JSON.stringify({
          count: notes.length,
          notes: notes.map((n) => ({
            id: Number(n.id),
            content: n.content.substring(0, 200) + (n.content.length > 200 ? "..." : ""),
            type: n.type,
            createdAt: n.createdAt.toISOString(),
            reminderAt: n.reminderAt?.toISOString(),
            tags: n.tags.map((t) => t.tag.name),
          })),
        })
      }

      case "get_reminders": {
        const days = (args.days as number) || 7
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + days)

        const notes = await prisma.note.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            isArchived: false,
            isRecycle: false,
            reminderAt: {
              gte: new Date(),
              lte: endDate,
            },
            reminderSent: false,
          },
          include: {
            entityLinks: true,
          },
          orderBy: { reminderAt: "asc" },
        })

        return JSON.stringify({
          count: notes.length,
          reminders: notes.map((n) => ({
            id: Number(n.id),
            content: n.content.substring(0, 200),
            reminderAt: n.reminderAt?.toISOString(),
            linkedEntities: n.entityLinks.map((l) => ({ type: l.entityType, id: Number(l.entityId) })),
          })),
        })
      }

      // ============================================
      // TASKS
      // ============================================
      case "create_task": {
        // Trouver le projet
        let projectId: bigint | undefined
        let columnId: bigint | undefined

        if (args.projectId) {
          projectId = BigInt(args.projectId as number)
        } else if (args.projectName) {
          const project = await prisma.project.findFirst({
            where: { name: { contains: args.projectName as string } },
          })
          if (project) projectId = project.id
        }

        // Si pas de projet spécifié, utiliser le projet "Général" ou le créer
        if (!projectId) {
          let generalProject = await prisma.project.findFirst({
            where: { name: "Général" },
          })
          if (!generalProject) {
            generalProject = await prisma.project.create({
              data: { name: "Général", description: "Tâches générales" },
            })
          }
          projectId = generalProject.id
        }

        // Trouver ou créer la colonne
        const columnName = (args.columnName as string) || "À faire"
        let column = await prisma.projectColumn.findFirst({
          where: { projectId, name: columnName },
        })
        if (!column) {
          const maxPosition = await prisma.projectColumn.aggregate({
            where: { projectId },
            _max: { position: true },
          })
          column = await prisma.projectColumn.create({
            data: {
              projectId,
              name: columnName,
              position: (maxPosition._max.position || 0) + 1,
            },
          })
        }
        columnId = column.id

        // Trouver le client
        let clientId: bigint | undefined
        if (args.clientId) {
          clientId = BigInt(args.clientId as number)
        } else if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: args.clientName as string }
            },
          })
          if (client) clientId = client.id
        }

        // Créer la tâche
        const maxPosition = await prisma.projectCard.aggregate({
          where: { columnId },
          _max: { position: true },
        })

        const task = await prisma.projectCard.create({
          data: {
            columnId,
            title: args.title as string,
            description: args.description as string | undefined,
            priority: (args.priority as "low" | "medium" | "high" | "urgent") || "medium",
            dueDate: args.dueDate ? new Date(args.dueDate as string) : undefined,
            clientId,
            position: (maxPosition._max.position || 0) + 1,
          },
        })

        return JSON.stringify({
          success: true,
          message: `Tâche "${task.title}" créée`,
          task: {
            id: Number(task.id),
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate?.toISOString(),
          },
        })
      }

      case "create_subtask": {
        const subtask = await prisma.projectSubtask.create({
          data: {
            cardId: BigInt(args.taskId as number),
            title: args.title as string,
            dueDate: args.dueDate ? new Date(args.dueDate as string) : undefined,
            priority: (args.priority as "low" | "medium" | "high" | "urgent") || "medium",
          },
        })

        return JSON.stringify({
          success: true,
          message: `Sous-tâche créée`,
          subtask: {
            id: Number(subtask.id),
            title: subtask.title,
          },
        })
      }

      case "list_tasks": {
        const limit = (args.limit as number) || 20
        const where: Record<string, unknown> = {}

        if (args.projectId) {
          where.column = { projectId: BigInt(args.projectId as number) }
        }
        if (args.clientId) {
          where.clientId = BigInt(args.clientId as number)
        }
        if (args.status === "pending") {
          where.isCompleted = false
        } else if (args.status === "completed") {
          where.isCompleted = true
        }
        if (args.priority) {
          where.priority = args.priority
        }

        const tasks = await prisma.projectCard.findMany({
          where,
          include: {
            column: { include: { project: true } },
            client: true,
            subtasks: true,
          },
          take: limit,
          orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        })

        return JSON.stringify({
          count: tasks.length,
          tasks: tasks.map((t) => ({
            id: Number(t.id),
            title: t.title,
            description: t.description?.substring(0, 100),
            priority: t.priority,
            isCompleted: t.isCompleted,
            dueDate: t.dueDate?.toISOString(),
            project: t.column.project?.name,
            column: t.column.name,
            client: t.client?.companyName,
            subtasks: {
              total: t.subtasks.length,
              completed: t.subtasks.filter((s) => s.isCompleted).length,
            },
          })),
        })
      }

      case "complete_task": {
        const task = await prisma.projectCard.update({
          where: { id: BigInt(args.taskId as number) },
          data: {
            isCompleted: true,
            completedAt: new Date(),
          },
        })

        return JSON.stringify({
          success: true,
          message: `Tâche "${task.title}" marquée comme terminée`,
        })
      }

      case "complete_subtask": {
        const subtask = await prisma.projectSubtask.update({
          where: { id: BigInt(args.subtaskId as number) },
          data: { isCompleted: true },
        })

        return JSON.stringify({
          success: true,
          message: `Sous-tâche "${subtask.title}" terminée`,
        })
      }

      // ============================================
      // QUOTES
      // ============================================
      case "create_quote": {
        // Trouver le client
        let clientId: bigint | undefined
        if (args.clientId) {
          clientId = BigInt(args.clientId as number)
        } else if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: args.clientName as string }
            },
          })
          if (client) clientId = client.id
        }

        if (!clientId) {
          return JSON.stringify({ error: "Client requis pour créer un devis" })
        }

        // Générer le numéro de devis
        const year = new Date().getFullYear()
        const lastQuote = await prisma.quote.findFirst({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            quoteNumber: { startsWith: `DEV-${year}-` }
          },
          orderBy: { quoteNumber: "desc" },
        })
        const nextNum = lastQuote
          ? parseInt(lastQuote.quoteNumber.split("-")[2]) + 1
          : 1
        const quoteNumber = `DEV-${year}-${String(nextNum).padStart(4, "0")}`

        // Calculer les totaux
        const items = args.items as Array<{
          description: string
          quantity: number
          unitPrice: number
          vatRate?: number
        }>

        let totalHT = 0
        let totalVAT = 0

        for (const item of items) {
          const lineTotal = item.quantity * item.unitPrice
          const vatRate = item.vatRate || 20
          totalHT += lineTotal
          totalVAT += lineTotal * (vatRate / 100)
        }
        const totalTTC = totalHT + totalVAT

        // Créer le devis
        const quote = await prisma.quote.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            clientId,
            quoteNumber,
            subject: args.subject as string || "Devis",
            status: "draft",
            totalAmount: totalHT,
            vatAmount: totalVAT,
            totalWithTax: totalTTC,
            notes: args.notes as string | undefined,
            validUntil: args.validUntil ? new Date(args.validUntil as string) : undefined,
            items: {
              create: items.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate || 20,
                totalPrice: item.quantity * item.unitPrice,
                position: index + 1,
              })),
            },
          },
          include: { items: true },
        })

        return JSON.stringify({
          success: true,
          message: `Devis ${quoteNumber} créé`,
          quote: {
            id: Number(quote.id),
            number: quote.quoteNumber,
            totalHT: totalHT.toFixed(2),
            totalTTC: totalTTC.toFixed(2),
            itemCount: items.length,
          },
        })
      }

      case "list_quotes": {
        const limit = (args.limit as number) || 20
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }

        if (args.clientId) where.clientId = BigInt(args.clientId as number)
        if (args.status) where.status = args.status

        const quotes = await prisma.quote.findMany({
          where,
          include: { client: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        })

        return JSON.stringify({
          count: quotes.length,
          quotes: quotes.map((q) => ({
            id: Number(q.id),
            number: q.quoteNumber,
            subject: q.subject,
            client: q.client.companyName,
            status: q.status,
            totalTTC: Number(q.totalWithTax).toFixed(2),
            createdAt: q.createdAt?.toISOString(),
            validUntil: q.validUntil?.toISOString(),
          })),
        })
      }

      case "search_quotes": {
        const query = args.query as string
        const limit = (args.limit as number) || 20

        const quotes = await prisma.quote.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            OR: [
              { quoteNumber: { contains: query } },
              { subject: { contains: query } },
              { client: { companyName: { contains: query } } },
            ],
          },
          include: { client: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        })

        return JSON.stringify({
          count: quotes.length,
          quotes: quotes.map((q) => ({
            id: Number(q.id),
            number: q.quoteNumber,
            subject: q.subject,
            client: q.client.companyName,
            status: q.status,
            totalTTC: Number(q.totalWithTax).toFixed(2),
          })),
        })
      }

      // ============================================
      // STATS
      // ============================================
      case "get_stats": {
        const period = (args.period as string) || "month"
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
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        const [clients, invoices, quotes, tasks] = await Promise.all([
          prisma.client.count({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              createdAt: { gte: startDate }
            },
          }),
          prisma.invoice.aggregate({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              createdAt: { gte: startDate }
            },
            _count: true,
            _sum: { totalWithTax: true },
          }),
          prisma.quote.aggregate({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              createdAt: { gte: startDate }
            },
            _count: true,
            _sum: { totalWithTax: true },
          }),
          prisma.projectCard.count({
            where: {
              createdAt: { gte: startDate },
              isCompleted: true,
            },
          }),
        ])

        return JSON.stringify({
          period,
          startDate: startDate.toISOString(),
          stats: {
            newClients: clients,
            invoices: {
              count: invoices._count,
              total: Number(invoices._sum.totalWithTax || 0).toFixed(2),
            },
            quotes: {
              count: quotes._count,
              total: Number(quotes._sum.totalWithTax || 0).toFixed(2),
            },
            tasksCompleted: tasks,
          },
        })
      }

      default:
        return JSON.stringify({ error: `Outil inconnu: ${name}` })
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error)
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

// ============================================
// SERVER SETUP
// ============================================

async function main() {
  const server = new Server(
    {
      name: "crm-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const result = await handleTool(name, args || {})
    return {
      content: [{ type: "text", text: result }],
    }
  })

  // Connect to transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error("CRM MCP Server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
