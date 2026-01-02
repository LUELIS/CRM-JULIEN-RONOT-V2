import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOvhClient } from "@/lib/ovh"
import { createCloudflareClient, detectDnsProvider } from "@/lib/cloudflare"
import dns from "dns"
import { promisify } from "util"

const resolvens = promisify(dns.resolveNs)

interface TenantSettings {
  ovhAppKey?: string
  ovhAppSecret?: string
  ovhConsumerKey?: string
  ovhEndpoint?: string
  cloudflareApiToken?: string
}

async function getTenantSettings(): Promise<TenantSettings> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    return {}
  }

  try {
    return JSON.parse(tenant.settings) as TenantSettings
  } catch {
    return {}
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get domain from database
    const domain = await prisma.domain.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: BigInt(1),
      },
    })

    if (!domain) {
      return NextResponse.json(
        { error: "Domaine non trouvé" },
        { status: 404 }
      )
    }

    const domainName = domain.domain
    const settings = await getTenantSettings()

    // First, try to resolve nameservers directly via DNS
    let nameserversFromDns: string[] = []
    let provider: "cloudflare" | "ovh" | "unknown" = "unknown"

    try {
      nameserversFromDns = await resolvens(domainName)
      provider = detectDnsProvider(nameserversFromDns)
    } catch (error) {
      console.error(`Error resolving DNS for ${domainName}:`, error)
    }

    // If provider is Cloudflare, get info from Cloudflare API
    if (provider === "cloudflare" && settings.cloudflareApiToken) {
      try {
        const client = createCloudflareClient({
          apiToken: settings.cloudflareApiToken,
        })

        const zone = await client.getZoneByName(domainName)

        if (zone) {
          return NextResponse.json({
            nameservers: zone.name_servers.map((ns, index) => ({
              id: index + 1,
              host: ns,
              ip: null,
              isUsed: true,
            })),
            provider: "cloudflare",
            zoneId: zone.id,
            zoneStatus: zone.status,
          })
        }
      } catch (error) {
        console.error("Error fetching Cloudflare zone:", error)
      }
    }

    // If provider is OVH, get info from OVH API
    if (provider === "ovh" && settings.ovhAppKey && settings.ovhAppSecret && settings.ovhConsumerKey) {
      try {
        const client = createOvhClient({
          appKey: settings.ovhAppKey,
          appSecret: settings.ovhAppSecret,
          consumerKey: settings.ovhConsumerKey,
          endpoint: settings.ovhEndpoint || "ovh-eu",
        })

        const nameservers = await client.getNameservers(domainName)

        return NextResponse.json({
          nameservers: nameservers.map((ns) => ({
            id: ns.id,
            host: ns.host,
            ip: ns.ip || null,
            isUsed: ns.isUsed,
          })),
          provider: "ovh",
        })
      } catch (error) {
        console.error("Error fetching OVH nameservers:", error)
      }
    }

    // Fallback: return DNS-resolved nameservers
    if (nameserversFromDns.length > 0) {
      return NextResponse.json({
        nameservers: nameserversFromDns.map((ns, index) => ({
          id: index + 1,
          host: ns,
          ip: null,
          isUsed: true,
        })),
        provider,
      })
    }

    // No nameservers found
    return NextResponse.json({
      nameservers: [],
      provider: "unknown",
    })
  } catch (error) {
    console.error("Error fetching nameservers:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération des serveurs DNS",
      },
      { status: 500 }
    )
  }
}
