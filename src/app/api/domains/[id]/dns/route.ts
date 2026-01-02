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

async function getOvhClient() {
  const settings = await getTenantSettings()
  const { ovhAppKey, ovhAppSecret, ovhConsumerKey, ovhEndpoint } = settings

  if (!ovhAppKey || !ovhAppSecret || !ovhConsumerKey) {
    throw new Error("Clés API OVH manquantes")
  }

  return createOvhClient({
    appKey: ovhAppKey,
    appSecret: ovhAppSecret,
    consumerKey: ovhConsumerKey,
    endpoint: ovhEndpoint || "ovh-eu",
  })
}

async function getCloudflareClient() {
  const settings = await getTenantSettings()
  const { cloudflareApiToken } = settings

  if (!cloudflareApiToken) {
    throw new Error("Token API Cloudflare manquant")
  }

  return createCloudflareClient({
    apiToken: cloudflareApiToken,
  })
}

// Detect DNS provider for a domain
async function detectProvider(domainName: string): Promise<"cloudflare" | "ovh" | "unknown"> {
  try {
    const nameservers = await resolvens(domainName)
    return detectDnsProvider(nameservers)
  } catch (error) {
    console.error(`Error resolving nameservers for ${domainName}:`, error)
    return "unknown"
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get domain from database
    const domainRecord = await prisma.domain.findUnique({
      where: { id: BigInt(id) },
    })

    if (!domainRecord) {
      return NextResponse.json(
        { error: "Domaine non trouvé" },
        { status: 404 }
      )
    }

    const domainName = domainRecord.domain
    const provider = await detectProvider(domainName)

    if (provider === "cloudflare") {
      // Use Cloudflare API
      try {
        const client = await getCloudflareClient()

        // First check if zone exists
        const zone = await client.getZoneByName(domainName)

        if (!zone) {
          return NextResponse.json({
            records: [],
            provider: "cloudflare",
            error: "Zone non trouvée dans votre compte Cloudflare. Ce domaine utilise peut-être un autre compte Cloudflare.",
            zoneNotFound: true,
          })
        }

        const records = await client.getDnsRecords(zone.id)

        const formattedRecords = records.map((record) => {
          // Extract subdomain from full name
          const subdomain = record.name === domainName
            ? "@"
            : record.name.replace(`.${domainName}`, "")

          return {
            id: record.id,
            type: record.type,
            subdomain,
            target: record.content,
            ttl: record.ttl === 1 ? 0 : record.ttl, // 1 = auto in Cloudflare
            proxied: record.proxied,
          }
        })

        // Sort records by type, then subdomain
        formattedRecords.sort((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type)
          return a.subdomain.localeCompare(b.subdomain)
        })

        return NextResponse.json({
          records: formattedRecords,
          provider: "cloudflare",
          zoneId: zone.id,
          zoneName: zone.name,
          zoneStatus: zone.status,
        })
      } catch (cfError) {
        console.error("Cloudflare API error:", cfError)
        return NextResponse.json({
          records: [],
          provider: "cloudflare",
          error: cfError instanceof Error ? cfError.message : "Erreur API Cloudflare",
        })
      }
    } else if (provider === "ovh") {
      // Use OVH API
      const client = await getOvhClient()

      // Get all record IDs
      const recordIds = await client.getDnsRecords(domainName)

      // Get details for each record
      const records = await Promise.all(
        recordIds.map(async (recordId: number) => {
          const record = await client.getDnsRecord(domainName, recordId)
          return {
            id: record.id,
            type: record.fieldType,
            subdomain: record.subDomain || "@",
            target: record.target,
            ttl: record.ttl,
          }
        })
      )

      // Sort records by type, then subdomain
      records.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type)
        return a.subdomain.localeCompare(b.subdomain)
      })

      return NextResponse.json({
        records,
        provider: "ovh",
      })
    } else {
      return NextResponse.json(
        { error: "Provider DNS non reconnu pour ce domaine", provider: "unknown" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error fetching DNS records:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération des enregistrements DNS",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    // Get domain from database
    const domainRecord = await prisma.domain.findUnique({
      where: { id: BigInt(id) },
    })

    if (!domainRecord) {
      return NextResponse.json(
        { error: "Domaine non trouvé" },
        { status: 404 }
      )
    }

    const domainName = domainRecord.domain
    const provider = await detectProvider(domainName)

    if (provider === "cloudflare") {
      const client = await getCloudflareClient()
      const zone = await client.getZoneByName(domainName)

      if (!zone) {
        return NextResponse.json(
          { error: "Zone Cloudflare non trouvée" },
          { status: 404 }
        )
      }

      // Build full name for Cloudflare
      const name = body.subdomain === "@" || !body.subdomain
        ? domainName
        : `${body.subdomain}.${domainName}`

      const record = await client.createDnsRecord(
        zone.id,
        body.type,
        name,
        body.target,
        body.ttl || 1, // 1 = auto
        body.proxied || false
      )

      const subdomain = record.name === domainName
        ? "@"
        : record.name.replace(`.${domainName}`, "")

      return NextResponse.json({
        id: record.id,
        type: record.type,
        subdomain,
        target: record.content,
        ttl: record.ttl,
        proxied: record.proxied,
        provider: "cloudflare",
      })
    } else if (provider === "ovh") {
      const client = await getOvhClient()

      const record = await client.createDnsRecord(
        domainName,
        body.type,
        body.subdomain === "@" ? "" : body.subdomain,
        body.target,
        body.ttl || 3600
      )

      // Refresh the zone
      await client.refreshDnsZone(domainName)

      return NextResponse.json({
        id: record.id,
        type: record.fieldType,
        subdomain: record.subDomain || "@",
        target: record.target,
        ttl: record.ttl,
        provider: "ovh",
      })
    } else {
      return NextResponse.json(
        { error: "Provider DNS non reconnu" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error creating DNS record:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la création de l'enregistrement DNS",
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    // Get domain from database
    const domainRecord = await prisma.domain.findUnique({
      where: { id: BigInt(id) },
    })

    if (!domainRecord) {
      return NextResponse.json(
        { error: "Domaine non trouvé" },
        { status: 404 }
      )
    }

    const domainName = domainRecord.domain
    const provider = await detectProvider(domainName)

    if (provider === "cloudflare") {
      const client = await getCloudflareClient()
      const zone = await client.getZoneByName(domainName)

      if (!zone) {
        return NextResponse.json(
          { error: "Zone Cloudflare non trouvée" },
          { status: 404 }
        )
      }

      // Build full name for Cloudflare
      const name = body.subdomain === "@" || !body.subdomain
        ? domainName
        : `${body.subdomain}.${domainName}`

      await client.updateDnsRecord(zone.id, body.recordId, {
        name,
        content: body.target,
        ttl: body.ttl || 1,
        proxied: body.proxied,
      })

      return NextResponse.json({ success: true, provider: "cloudflare" })
    } else if (provider === "ovh") {
      const client = await getOvhClient()

      await client.updateDnsRecord(domainName, body.recordId, {
        subDomain: body.subdomain === "@" ? "" : body.subdomain,
        target: body.target,
        ttl: body.ttl,
      })

      // Refresh the zone
      await client.refreshDnsZone(domainName)

      return NextResponse.json({ success: true, provider: "ovh" })
    } else {
      return NextResponse.json(
        { error: "Provider DNS non reconnu" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error updating DNS record:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la modification de l'enregistrement DNS",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get("recordId")

    if (!recordId) {
      return NextResponse.json(
        { error: "ID d'enregistrement manquant" },
        { status: 400 }
      )
    }

    // Get domain from database
    const domainRecord = await prisma.domain.findUnique({
      where: { id: BigInt(id) },
    })

    if (!domainRecord) {
      return NextResponse.json(
        { error: "Domaine non trouvé" },
        { status: 404 }
      )
    }

    const domainName = domainRecord.domain
    const provider = await detectProvider(domainName)

    if (provider === "cloudflare") {
      const client = await getCloudflareClient()
      const zone = await client.getZoneByName(domainName)

      if (!zone) {
        return NextResponse.json(
          { error: "Zone Cloudflare non trouvée" },
          { status: 404 }
        )
      }

      await client.deleteDnsRecord(zone.id, recordId)

      return NextResponse.json({ success: true, provider: "cloudflare" })
    } else if (provider === "ovh") {
      const client = await getOvhClient()

      await client.deleteDnsRecord(domainName, parseInt(recordId))

      // Refresh the zone
      await client.refreshDnsZone(domainName)

      return NextResponse.json({ success: true, provider: "ovh" })
    } else {
      return NextResponse.json(
        { error: "Provider DNS non reconnu" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error deleting DNS record:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression de l'enregistrement DNS",
      },
      { status: 500 }
    )
  }
}
