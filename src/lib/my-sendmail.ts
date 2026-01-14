/**
 * My-Sendmail API Client
 * Documentation: https://mail01.my-sendmail.fr/api
 */

interface MySendmailConfig {
  apiKey: string
}

export interface MySendmailAccount {
  id: string
  email: string
  active: boolean
  createdAt: string
}

export interface MySendmailDomain {
  id: string
  name: string
  dailyLimit: number
  monthlyLimit: number
  dailySent: number
  monthlySent: number
  active: boolean
  accounts: MySendmailAccount[]
  user?: {
    email: string
    role: string
  }
  _count?: {
    emails: number
  }
  createdAt: string
}

export interface MySendmailEmail {
  id: string
  from: string
  to: string[]
  subject: string
  status: "PENDING" | "SENT" | "FAILED" | "REJECTED"
  phishingScore: number
  spamScore: number
  blocked: boolean
  senderEmail: string
  domain?: {
    name: string
  }
  ipAddress?: string
  createdAt: string
  sentAt?: string
}

export interface MySendmailStats {
  totalReceived: number
  totalSent: number
  totalBlocked: number
  totalFailed: number
  avgPhishingScore: number
  avgSpamScore: number
}

export interface MySendmailTimeseries {
  date: string
  received: number
  sent: number
  blocked: number
  failed: number
}

interface MySendmailDomainsResponse {
  smtpConfig: {
    server: string
    port: number
    security: string
    authentication: string
    note: string
  }
  domains: MySendmailDomain[]
}

export class MySendmailClient {
  private apiKey: string
  private baseUrl = "https://mail01.my-sendmail.fr/api"

  constructor(config: MySendmailConfig) {
    this.apiKey = config.apiKey
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(error.error || error.message || `My-Sendmail API Error: ${res.status}`)
    }

    // Handle empty responses (204 No Content)
    if (res.status === 204) {
      return {} as T
    }

    return res.json()
  }

  // Health check
  async health(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.request("GET", "/health")
  }

  // Test connection by getting domains
  async testConnection(): Promise<{ success: boolean; domains: number }> {
    try {
      const response = await this.request<MySendmailDomainsResponse>("GET", "/domains")
      return { success: true, domains: response.domains?.length || 0 }
    } catch (error) {
      throw error
    }
  }

  // Get all domains with accounts
  async getDomains(): Promise<MySendmailDomain[]> {
    const response = await this.request<MySendmailDomainsResponse>("GET", "/domains")
    return response.domains || []
  }

  // Get single domain
  async getDomain(id: string): Promise<MySendmailDomain> {
    return this.request<MySendmailDomain>("GET", `/domains/${id}`)
  }

  // Create domain
  async createDomain(
    name: string,
    dailyLimit: number = 1000,
    monthlyLimit: number = 30000
  ): Promise<MySendmailDomain> {
    return this.request<MySendmailDomain>("POST", "/domains", {
      name,
      dailyLimit,
      monthlyLimit,
    })
  }

  // Update domain limits
  async updateDomain(
    id: string,
    data: { dailyLimit?: number; monthlyLimit?: number; active?: boolean }
  ): Promise<MySendmailDomain> {
    return this.request<MySendmailDomain>("PUT", `/domains/${id}`, data)
  }

  // Delete domain
  async deleteDomain(id: string): Promise<void> {
    await this.request<void>("DELETE", `/domains/${id}`)
  }

  // Reset daily counter for domain
  async resetDailyCounter(id: string): Promise<void> {
    await this.request<void>("POST", `/domains/${id}/reset-daily`)
  }

  // Create account for domain
  async createAccount(
    domainId: string,
    email: string,
    password: string
  ): Promise<MySendmailAccount> {
    return this.request<MySendmailAccount>("POST", `/domains/${domainId}/accounts`, {
      email,
      password,
    })
  }

  // Update account
  async updateAccount(
    domainId: string,
    accountId: string,
    data: { password?: string; active?: boolean }
  ): Promise<MySendmailAccount> {
    return this.request<MySendmailAccount>(
      "PUT",
      `/domains/${domainId}/accounts/${accountId}`,
      data
    )
  }

  // Delete account
  async deleteAccount(domainId: string, accountId: string): Promise<void> {
    await this.request<void>("DELETE", `/domains/${domainId}/accounts/${accountId}`)
  }

  // Get emails list
  async getEmails(params?: {
    limit?: number
    offset?: number
    status?: string
    blocked?: boolean
  }): Promise<{ emails: MySendmailEmail[]; total: number }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.set("limit", params.limit.toString())
    if (params?.offset) queryParams.set("offset", params.offset.toString())
    if (params?.status) queryParams.set("status", params.status)
    if (params?.blocked !== undefined) queryParams.set("blocked", params.blocked.toString())

    const query = queryParams.toString()
    return this.request("GET", `/emails${query ? `?${query}` : ""}`)
  }

  // Get single email
  async getEmail(id: string): Promise<MySendmailEmail> {
    return this.request("GET", `/emails/${id}`)
  }

  // Get global stats
  async getStats(): Promise<MySendmailStats> {
    return this.request("GET", "/stats")
  }

  // Get timeseries stats
  async getTimeseries(days: number = 7): Promise<MySendmailTimeseries[]> {
    return this.request("GET", `/stats/timeseries?days=${days}`)
  }
}

// Factory function
export function createMySendmailClient(config: MySendmailConfig): MySendmailClient {
  return new MySendmailClient(config)
}
