import crypto from "crypto"

interface OvhConfig {
  appKey: string
  appSecret: string
  consumerKey: string
  endpoint: string
}

interface OvhDomain {
  domain: string
  nameServerType: string
  offer: string
  transferLockStatus: string
  whoisOwner: string
}

interface OvhDomainDetails {
  domain: string
  lastUpdate: string
  nameServerType: string
  offer: string
  owo: boolean | null
  owoSupported: boolean
  parentService: null | {
    name: string
    type: string
  }
  transferLockStatus: string
  whoisOwner: string
}

interface OvhZoneRecord {
  id: number
  fieldType: string
  subDomain: string
  target: string
  ttl: number
}

interface OvhDomainServiceInfo {
  domain: string
  contactAdmin: string
  contactBilling: string
  contactTech: string
  creation: string
  expiration: string
  possibleRenewPeriod: number[]
  renew: {
    automatic: boolean
    deleteAtExpiration: boolean
    forced: boolean
    manualPayment: boolean
    period: number
  }
  renewalType: string
  serviceId: number
  status: string
}

const ENDPOINTS: Record<string, string> = {
  "ovh-eu": "https://eu.api.ovh.com/1.0",
  "ovh-ca": "https://ca.api.ovh.com/1.0",
  "ovh-us": "https://us.api.ovh.com/1.0",
  "kimsufi-eu": "https://eu.api.kimsufi.com/1.0",
  "kimsufi-ca": "https://ca.api.kimsufi.com/1.0",
  "soyoustart-eu": "https://eu.api.soyoustart.com/1.0",
  "soyoustart-ca": "https://ca.api.soyoustart.com/1.0",
}

export class OvhClient {
  private appKey: string
  private appSecret: string
  private consumerKey: string
  private baseUrl: string
  private timeDelta: number = 0

  constructor(config: OvhConfig) {
    this.appKey = config.appKey
    this.appSecret = config.appSecret
    this.consumerKey = config.consumerKey
    this.baseUrl = ENDPOINTS[config.endpoint] || ENDPOINTS["ovh-eu"]
  }

  private async getTimeDelta(): Promise<number> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/time`)
      const serverTime = await res.json()
      this.timeDelta = serverTime - Math.floor(Date.now() / 1000)
      return this.timeDelta
    } catch {
      return 0
    }
  }

  private sign(
    method: string,
    path: string,
    body: string,
    timestamp: number
  ): string {
    const toSign = [
      this.appSecret,
      this.consumerKey,
      method.toUpperCase(),
      this.baseUrl + path,
      body || "",
      timestamp.toString(),
    ].join("+")

    return "$1$" + crypto.createHash("sha1").update(toSign).digest("hex")
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    if (this.timeDelta === 0) {
      await this.getTimeDelta()
    }

    const timestamp = Math.floor(Date.now() / 1000) + this.timeDelta
    const body = data ? JSON.stringify(data) : ""
    const signature = this.sign(method, path, body, timestamp)

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Ovh-Application": this.appKey,
      "X-Ovh-Timestamp": timestamp.toString(),
      "X-Ovh-Signature": signature,
      "X-Ovh-Consumer": this.consumerKey,
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body || undefined,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `OVH API Error: ${res.status}`)
    }

    return res.json()
  }

  // Test connection by getting domain list
  async testConnection(): Promise<{ success: boolean; domains: number }> {
    try {
      const domains = await this.getDomains()
      return { success: true, domains: domains.length }
    } catch (error) {
      throw error
    }
  }

  // Get list of domains
  async getDomains(): Promise<string[]> {
    return this.request<string[]>("GET", "/domain")
  }

  // Get domain details
  async getDomainDetails(domain: string): Promise<OvhDomainDetails> {
    return this.request<OvhDomainDetails>("GET", `/domain/${domain}`)
  }

  // Get domain service info (includes expiration date)
  async getDomainServiceInfo(domain: string): Promise<OvhDomainServiceInfo> {
    return this.request<OvhDomainServiceInfo>(
      "GET",
      `/domain/${domain}/serviceInfos`
    )
  }

  // Get DNS zone records
  async getDnsRecords(domain: string, fieldType?: string): Promise<number[]> {
    const params = fieldType ? `?fieldType=${fieldType}` : ""
    return this.request<number[]>("GET", `/domain/zone/${domain}/record${params}`)
  }

  // Get specific DNS record
  async getDnsRecord(domain: string, recordId: number): Promise<OvhZoneRecord> {
    return this.request<OvhZoneRecord>(
      "GET",
      `/domain/zone/${domain}/record/${recordId}`
    )
  }

  // Create DNS record
  async createDnsRecord(
    domain: string,
    fieldType: string,
    subDomain: string,
    target: string,
    ttl: number = 3600
  ): Promise<OvhZoneRecord> {
    return this.request<OvhZoneRecord>("POST", `/domain/zone/${domain}/record`, {
      fieldType,
      subDomain,
      target,
      ttl,
    })
  }

  // Update DNS record
  async updateDnsRecord(
    domain: string,
    recordId: number,
    data: Partial<{ subDomain: string; target: string; ttl: number }>
  ): Promise<void> {
    return this.request<void>(
      "PUT",
      `/domain/zone/${domain}/record/${recordId}`,
      data
    )
  }

  // Delete DNS record
  async deleteDnsRecord(domain: string, recordId: number): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/domain/zone/${domain}/record/${recordId}`
    )
  }

  // Refresh DNS zone
  async refreshDnsZone(domain: string): Promise<void> {
    return this.request<void>("POST", `/domain/zone/${domain}/refresh`)
  }

  // Get nameservers - OVH returns IDs, we need to fetch each one
  async getNameservers(domain: string): Promise<{ id: number; host: string; ip?: string; isUsed: boolean; toDelete: boolean }[]> {
    // First get the list of nameserver IDs
    const ids = await this.request<number[]>("GET", `/domain/${domain}/nameServer`)

    // Then fetch each nameserver's details
    const nameservers = await Promise.all(
      ids.map(async (id) => {
        try {
          const ns = await this.request<{ id: number; host: string; ip?: string; isUsed: boolean; toDelete: boolean }>(
            "GET",
            `/domain/${domain}/nameServer/${id}`
          )
          return ns
        } catch {
          return { id, host: `ns${id}.unknown`, isUsed: true, toDelete: false }
        }
      })
    )

    return nameservers
  }

  // Update nameservers (set custom)
  async updateNameservers(
    domain: string,
    nameServers: { host: string; ip?: string }[]
  ): Promise<void> {
    return this.request<void>("POST", `/domain/${domain}/nameServer/update`, {
      nameServers,
    })
  }

  // Get all domain info with expiration
  async getDomainsWithInfo(): Promise<
    Array<{
      domain: string
      expiration: string
      status: string
      nameServerType: string
      offer: string
    }>
  > {
    const domains = await this.getDomains()
    const results = []

    for (const domain of domains) {
      try {
        const [details, serviceInfo] = await Promise.all([
          this.getDomainDetails(domain),
          this.getDomainServiceInfo(domain),
        ])

        results.push({
          domain,
          expiration: serviceInfo.expiration,
          status: serviceInfo.status,
          nameServerType: details.nameServerType,
          offer: details.offer,
        })
      } catch (error) {
        // If we can't get info for a domain, add it with minimal data
        results.push({
          domain,
          expiration: "",
          status: "unknown",
          nameServerType: "",
          offer: "",
        })
      }
    }

    return results
  }
}

// Create OVH client from config
export function createOvhClient(config: OvhConfig): OvhClient {
  return new OvhClient(config)
}
