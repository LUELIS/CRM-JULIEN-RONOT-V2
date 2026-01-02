import { Prisma } from '@/generated/prisma/client'

// Extend NextAuth types for v5
declare module "next-auth" {
  interface User {
    id: string
    type?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      type: string
      clientId?: string
      isPrimaryUser?: boolean
      isImpersonating?: boolean
      originalUserId?: string
      originalUserType?: string
    }
  }
}

// Client with relations
export type ClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    invoices: true
    quotes: true
    subscriptions: true
  }
}>

// Invoice with relations
export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: true
    items: { include: { service: true } }
  }
}>

// Quote with relations
export type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: {
    client: true
    items: { include: { service: true } }
  }
}>

// Ticket with relations
export type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    client: true
    assignee: true
    messages: { include: { user: true, attachments: true } }
    attachments: true
    reminders: true
  }
}>

// Subscription with relations
export type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: {
    client: true
    items: { include: { service: true } }
  }
}>

// Bank Account with relations
export type BankAccountWithRelations = Prisma.BankAccountGetPayload<{
  include: {
    transactions: true
    recurringTransactions: true
  }
}>

// Dashboard Stats
export interface DashboardStats {
  totalClients: number
  activeClients: number
  totalInvoices: number
  unpaidInvoices: number
  totalQuotes: number
  pendingQuotes: number
  totalRevenue: number
  monthlyRevenue: number
  openTickets: number
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
