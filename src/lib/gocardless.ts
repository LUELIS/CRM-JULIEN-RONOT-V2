// GoCardless Bank Account Data API Client

const GOCARDLESS_API_URL = "https://bankaccountdata.gocardless.com/api/v2"

interface GocardlessTokenResponse {
  access: string
  access_expires: number
  refresh: string
  refresh_expires: number
}

interface GocardlessInstitution {
  id: string
  name: string
  bic: string
  transaction_total_days: string
  countries: string[]
  logo: string
}

interface GocardlessRequisition {
  id: string
  created: string
  redirect: string
  status: string
  institution_id: string
  agreement: string
  reference: string
  accounts: string[]
  user_language: string
  link: string
}

interface GocardlessAccount {
  id: string
  created: string
  last_accessed: string
  iban: string
  institution_id: string
  status: string
  owner_name: string
}

interface GocardlessAccountDetails {
  resourceId: string
  iban: string
  currency: string
  ownerName: string
  name: string
  product: string
  cashAccountType: string
}

interface GocardlessBalance {
  balanceAmount: {
    amount: string
    currency: string
  }
  balanceType: string
  referenceDate: string
}

interface GocardlessTransaction {
  transactionId: string
  bookingDate: string
  valueDate: string
  transactionAmount: {
    amount: string
    currency: string
  }
  creditorName?: string
  creditorAccount?: { iban: string }
  debtorName?: string
  debtorAccount?: { iban: string }
  remittanceInformationUnstructured?: string
  remittanceInformationUnstructuredArray?: string[]
  bankTransactionCode?: string
  proprietaryBankTransactionCode?: string
  internalTransactionId?: string
}

interface GocardlessTransactionsResponse {
  transactions: {
    booked: GocardlessTransaction[]
    pending: GocardlessTransaction[]
  }
}

// Rate limit info from GoCardless API responses
interface RateLimitInfo {
  limit: number | null       // Total requests allowed per day
  remaining: number | null   // Requests remaining
  reset: Date | null         // When the limit resets
  lastUpdated: Date | null   // When this info was captured
}

class GocardlessClient {
  private secretId: string
  private secretKey: string
  private accessToken: string | null = null
  private tokenExpires: number = 0
  private rateLimitInfo: RateLimitInfo = {
    limit: null,
    remaining: null,
    reset: null,
    lastUpdated: null,
  }

  constructor(secretId: string, secretKey: string) {
    this.secretId = secretId
    this.secretKey = secretKey
  }

  // Get current rate limit info
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpires - 60000) {
      return this.accessToken
    }

    const response = await fetch(`${GOCARDLESS_API_URL}/token/new/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret_id: this.secretId,
        secret_key: this.secretKey,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`GoCardless auth failed: ${JSON.stringify(error)}`)
    }

    const data: GocardlessTokenResponse = await response.json()
    this.accessToken = data.access
    this.tokenExpires = Date.now() + data.access_expires * 1000

    return this.accessToken
  }

  private async request<T>(
    endpoint: string,
    method: string = "GET",
    body?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken()

    const response = await fetch(`${GOCARDLESS_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Capture rate limit headers from response
    // GoCardless uses: HTTP_X_RATELIMIT_LIMIT, HTTP_X_RATELIMIT_REMAINING, HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_REMAINING
    const rateLimitHeader = response.headers.get("x-ratelimit-limit")
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining")
      || response.headers.get("x-ratelimit-account-success-remaining")
    const rateLimitReset = response.headers.get("x-ratelimit-reset")

    if (rateLimitHeader || rateLimitRemaining) {
      this.rateLimitInfo = {
        limit: rateLimitHeader ? parseInt(rateLimitHeader, 10) : this.rateLimitInfo.limit,
        remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : this.rateLimitInfo.remaining,
        reset: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000) : this.rateLimitInfo.reset,
        lastUpdated: new Date(),
      }
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`GoCardless request failed: ${JSON.stringify(error)}`)
    }

    return response.json()
  }

  // Get list of institutions (banks) for a country
  async getInstitutions(country: string = "FR"): Promise<GocardlessInstitution[]> {
    return this.request<GocardlessInstitution[]>(`/institutions/?country=${country}`)
  }

  // Create end user agreement
  async createAgreement(institutionId: string, maxHistoricalDays: number = 90) {
    return this.request(`/agreements/enduser/`, "POST", {
      institution_id: institutionId,
      max_historical_days: maxHistoricalDays,
      access_valid_for_days: 90,
      access_scope: ["balances", "details", "transactions"],
    })
  }

  // Create requisition (connection request)
  async createRequisition(
    institutionId: string,
    redirectUri: string,
    reference: string,
    agreementId?: string
  ): Promise<GocardlessRequisition> {
    return this.request<GocardlessRequisition>(`/requisitions/`, "POST", {
      redirect: redirectUri,
      institution_id: institutionId,
      reference,
      user_language: "FR",
      agreement: agreementId,
    })
  }

  // Get requisition status
  async getRequisition(requisitionId: string): Promise<GocardlessRequisition> {
    return this.request<GocardlessRequisition>(`/requisitions/${requisitionId}/`)
  }

  // Get account details
  async getAccount(accountId: string): Promise<GocardlessAccount> {
    return this.request<GocardlessAccount>(`/accounts/${accountId}/`)
  }

  // Get account details (IBAN, name, etc.)
  async getAccountDetails(accountId: string): Promise<{ account: GocardlessAccountDetails }> {
    return this.request(`/accounts/${accountId}/details/`)
  }

  // Get account balances
  async getAccountBalances(accountId: string): Promise<{ balances: GocardlessBalance[] }> {
    return this.request(`/accounts/${accountId}/balances/`)
  }

  // Get account transactions
  async getAccountTransactions(
    accountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<GocardlessTransactionsResponse> {
    let endpoint = `/accounts/${accountId}/transactions/`
    const params = new URLSearchParams()
    if (dateFrom) params.set("date_from", dateFrom)
    if (dateTo) params.set("date_to", dateTo)
    if (params.toString()) endpoint += `?${params.toString()}`

    return this.request(endpoint)
  }

  // Delete requisition
  async deleteRequisition(requisitionId: string): Promise<void> {
    await this.request(`/requisitions/${requisitionId}/`, "DELETE")
  }
}

export {
  GocardlessClient,
  type GocardlessInstitution,
  type GocardlessRequisition,
  type GocardlessAccount,
  type GocardlessAccountDetails,
  type GocardlessBalance,
  type GocardlessTransaction,
  type GocardlessTransactionsResponse,
  type RateLimitInfo,
}
