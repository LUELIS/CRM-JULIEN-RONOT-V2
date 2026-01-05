interface CloudflareConfig {
  apiToken: string
}

interface CloudflareZone {
  id: string
  name: string
  status: string
  paused: boolean
  type: string
  development_mode: number
  name_servers: string[]
  original_name_servers: string[]
  original_registrar: string | null
  original_dnshost: string | null
  modified_on: string
  created_on: string
  activated_on: string | null
  meta: {
    step: number
    custom_certificate_quota: number
    page_rule_quota: number
    phishing_detected: boolean
    multiple_railguns_allowed: boolean
  }
  owner: {
    id: string
    type: string
    email: string
  }
  account: {
    id: string
    name: string
  }
  permissions: string[]
  plan: {
    id: string
    name: string
    price: number
    currency: string
    frequency: string
    is_subscribed: boolean
    can_subscribe: boolean
    legacy_id: string
    legacy_discount: boolean
    externally_managed: boolean
  }
}

interface CloudflareDnsRecord {
  id: string
  zone_id: string
  zone_name: string
  name: string
  type: string
  content: string
  proxiable: boolean
  proxied: boolean
  ttl: number
  locked: boolean
  meta: {
    auto_added: boolean
    managed_by_apps: boolean
    managed_by_argo_tunnel: boolean
    source: string
  }
  comment: string | null
  tags: string[]
  created_on: string
  modified_on: string
}

interface CloudflareApiResponse<T> {
  success: boolean
  errors: { code: number; message: string }[]
  messages: string[]
  result: T
  result_info?: {
    page: number
    per_page: number
    total_pages: number
    count: number
    total_count: number
  }
}

export class CloudflareClient {
  private apiToken: string
  private baseUrl = "https://api.cloudflare.com/client/v4"

  constructor(config: CloudflareConfig) {
    this.apiToken = config.apiToken
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiToken}`,
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    const json = (await res.json()) as CloudflareApiResponse<T>

    if (!json.success) {
      const errorMessage = json.errors
        .map((e) => e.message)
        .join(", ")
      throw new Error(errorMessage || `Cloudflare API Error: ${res.status}`)
    }

    return json.result
  }

  // Test connection by getting user info
  async testConnection(): Promise<{ success: boolean; email: string }> {
    try {
      const user = await this.request<{ id: string; email: string }>(
        "GET",
        "/user"
      )
      return { success: true, email: user.email }
    } catch (error) {
      throw error
    }
  }

  // Get all zones (domains)
  async getZones(): Promise<CloudflareZone[]> {
    return this.request<CloudflareZone[]>("GET", "/zones?per_page=50")
  }

  // Get zone by domain name
  async getZoneByName(domainName: string): Promise<CloudflareZone | null> {
    const zones = await this.request<CloudflareZone[]>(
      "GET",
      `/zones?name=${domainName}`
    )
    return zones.length > 0 ? zones[0] : null
  }

  // Get zone details
  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.request<CloudflareZone>("GET", `/zones/${zoneId}`)
  }

  // Get DNS records for a zone
  async getDnsRecords(zoneId: string, type?: string): Promise<CloudflareDnsRecord[]> {
    const params = type ? `?type=${type}&per_page=100` : "?per_page=100"
    return this.request<CloudflareDnsRecord[]>(
      "GET",
      `/zones/${zoneId}/dns_records${params}`
    )
  }

  // Get specific DNS record
  async getDnsRecord(
    zoneId: string,
    recordId: string
  ): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(
      "GET",
      `/zones/${zoneId}/dns_records/${recordId}`
    )
  }

  // Create DNS record
  async createDnsRecord(
    zoneId: string,
    type: string,
    name: string,
    content: string,
    ttl: number = 1,
    proxied: boolean = false,
    priority?: number
  ): Promise<CloudflareDnsRecord> {
    const data: Record<string, unknown> = {
      type,
      name,
      content,
      ttl, // 1 = auto
      proxied,
    }

    if (priority !== undefined && type === "MX") {
      data.priority = priority
    }

    return this.request<CloudflareDnsRecord>(
      "POST",
      `/zones/${zoneId}/dns_records`,
      data
    )
  }

  // Update DNS record
  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    data: Partial<{
      type: string
      name: string
      content: string
      ttl: number
      proxied: boolean
      priority: number
    }>
  ): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(
      "PATCH",
      `/zones/${zoneId}/dns_records/${recordId}`,
      data
    )
  }

  // Delete DNS record
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      "DELETE",
      `/zones/${zoneId}/dns_records/${recordId}`
    )
  }

  // Purge all cache for a zone
  async purgeAllCache(zoneId: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      "POST",
      `/zones/${zoneId}/purge_cache`,
      { purge_everything: true }
    )
  }

  // Purge cache for specific URLs
  async purgeCacheByUrls(zoneId: string, urls: string[]): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      "POST",
      `/zones/${zoneId}/purge_cache`,
      { files: urls }
    )
  }

  // Purge cache for specific hostnames
  async purgeCacheByHostnames(zoneId: string, hostnames: string[]): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      "POST",
      `/zones/${zoneId}/purge_cache`,
      { hosts: hostnames }
    )
  }

  // Purge cache by domain name (finds zone automatically)
  async purgeCacheForDomain(domainName: string): Promise<{ id: string; zoneName: string }> {
    // Extract root domain from subdomain (e.g., crm.example.com -> example.com)
    const parts = domainName.split(".")
    let rootDomain = domainName

    // Try to find zone, starting with full domain and working up
    let zone = null
    while (parts.length >= 2 && !zone) {
      rootDomain = parts.join(".")
      zone = await this.getZoneByName(rootDomain)
      if (!zone) parts.shift()
    }

    if (!zone) {
      throw new Error(`Zone not found for domain: ${domainName}`)
    }

    const result = await this.purgeAllCache(zone.id)
    return { ...result, zoneName: zone.name }
  }

  // Get all DNS records for a domain name (finds zone first)
  async getDnsRecordsForDomain(
    domainName: string
  ): Promise<{ zone: CloudflareZone; records: CloudflareDnsRecord[] }> {
    const zone = await this.getZoneByName(domainName)
    if (!zone) {
      throw new Error(`Zone not found for domain: ${domainName}`)
    }

    const records = await this.getDnsRecords(zone.id)
    return { zone, records }
  }

  // Get zones with info (similar to OVH's getDomainsWithInfo)
  async getZonesWithInfo(): Promise<
    Array<{
      domain: string
      zoneId: string
      status: string
      nameservers: string[]
      plan: string
    }>
  > {
    const zones = await this.getZones()
    return zones.map((zone) => ({
      domain: zone.name,
      zoneId: zone.id,
      status: zone.status,
      nameservers: zone.name_servers,
      plan: zone.plan.name,
    }))
  }
}

// Create Cloudflare client from config
export function createCloudflareClient(config: CloudflareConfig): CloudflareClient {
  return new CloudflareClient(config)
}

// Helper to detect DNS provider from nameservers
export function detectDnsProvider(
  nameservers: string[]
): "cloudflare" | "ovh" | "unknown" {
  const nsLower = nameservers.map((ns) => ns.toLowerCase())

  // Check for Cloudflare nameservers (*.ns.cloudflare.com)
  if (nsLower.some((ns) => ns.includes("cloudflare.com"))) {
    return "cloudflare"
  }

  // Check for OVH nameservers (dns*.ovh.net, ns*.ovh.net, *.anycast.ovh.net)
  if (
    nsLower.some(
      (ns) =>
        ns.includes(".ovh.net") ||
        ns.includes(".ovh.com") ||
        ns.includes(".anycast.me")
    )
  ) {
    return "ovh"
  }

  return "unknown"
}
