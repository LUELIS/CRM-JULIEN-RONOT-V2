import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  notifyDeploymentSuccess,
  notifyDeploymentFailure,
  notifyAppError,
  parseSlackConfig,
} from "@/lib/slack"
import { CloudflareClient } from "@/lib/cloudflare"

// Dokploy servers configuration
const DOKPLOY_SERVERS = [
  {
    id: 7,
    name: "Orion",
    url: "http://57.129.101.188:3000",
    token: "TCKeNZKoJikPGzKhZOyKXkxzHruGfUQAkEdahaXbvnIMQWvjDscNukRqMAwNfORU",
  },
  {
    id: 8,
    name: "Andromeda",
    url: "http://157.90.135.243:3000",
    token: "CElixReOpXvxPXNLChkoqCgUUZioKgZfPduPEmIifqUcFkmJjPbBqtTWNjCHUMEA",
  },
  {
    id: 9,
    name: "Cassiopeia",
    url: "http://62.210.65.57:3000",
    token: "tKGYTJfGgZQVuDgZYqoHMmrUtfGIsvpqUYoPUiodYkUHSEjnwyclPOGMJHQNNHAY",
  },
]

interface Deployment {
  deploymentId: string
  title: string
  status: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  applicationId: string
}

interface Application {
  applicationId: string
  name: string
  appName: string
  applicationStatus: string
  repository: string | null
  owner: string | null
  branch: string | null
}

interface ProjectData {
  projectId: string
  name: string
  environments: {
    environmentId: string
    applications: Application[]
    compose: Array<{
      composeId: string
      name: string
      appName: string
      composeStatus: string
    }>
  }[]
}

interface DeploymentState {
  lastCheckedDeployments: Record<string, string> // deploymentId -> status
  lastNotifiedAppErrors: Record<string, number> // appId -> timestamp
}

// Get Slack config from tenant settings
async function getSlackConfig() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })
  if (!tenant?.settings) return null
  const settings = JSON.parse(tenant.settings as string)
  return parseSlackConfig(settings)
}

// Get Cloudflare config from tenant settings
async function getCloudflareConfig(): Promise<{
  enabled: boolean
  apiToken: string
  purgeOnDeploy: boolean
} | null> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    if (!settings.cloudflareApiToken) return null

    return {
      enabled: settings.cloudflareEnabled ?? false,
      apiToken: settings.cloudflareApiToken,
      purgeOnDeploy: settings.cloudflarePurgeOnDeploy ?? true,
    }
  } catch {
    return null
  }
}

// Get domains for an app from Dokploy
async function getAppDomains(
  server: (typeof DOKPLOY_SERVERS)[0],
  applicationId: string
): Promise<string[]> {
  try {
    const app = (await fetchFromDokploy(server, "application.one", { applicationId })) as {
      domains?: Array<{ host: string }>
    } | null

    if (!app?.domains) return []
    return app.domains.map((d) => d.host)
  } catch {
    return []
  }
}

// Purge Cloudflare cache for domains
async function purgeCloudflareCache(
  cloudflareConfig: { apiToken: string },
  domains: string[]
): Promise<{ success: boolean; purged: string[]; errors: string[] }> {
  const client = new CloudflareClient({ apiToken: cloudflareConfig.apiToken })
  const purged: string[] = []
  const errors: string[] = []

  for (const domain of domains) {
    try {
      const result = await client.purgeCacheForDomain(domain)
      purged.push(`${domain} (zone: ${result.zoneName})`)
      console.log(`[Cron] Cache purged for ${domain} (zone: ${result.zoneName})`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      errors.push(`${domain}: ${msg}`)
      console.error(`[Cron] Failed to purge cache for ${domain}:`, msg)
    }
  }

  return { success: errors.length === 0, purged, errors }
}

// Get deployment notification settings
async function getDeploymentNotificationSettings(): Promise<{
  enabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnAppError: boolean
}> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    return {
      enabled: false,
      notifyOnSuccess: false,
      notifyOnFailure: true,
      notifyOnAppError: true,
    }
  }

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      enabled: settings.deploymentNotificationsEnabled ?? true,
      notifyOnSuccess: settings.deploymentNotifyOnSuccess ?? false,
      notifyOnFailure: settings.deploymentNotifyOnFailure ?? true,
      notifyOnAppError: settings.deploymentNotifyOnAppError ?? true,
    }
  } catch {
    return {
      enabled: false,
      notifyOnSuccess: false,
      notifyOnFailure: true,
      notifyOnAppError: true,
    }
  }
}

// Get/update deployment state in tenant settings
async function getDeploymentState(): Promise<DeploymentState> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    return {
      lastCheckedDeployments: {},
      lastNotifiedAppErrors: {},
    }
  }

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      lastCheckedDeployments: settings.deploymentState?.lastCheckedDeployments || {},
      lastNotifiedAppErrors: settings.deploymentState?.lastNotifiedAppErrors || {},
    }
  } catch {
    return {
      lastCheckedDeployments: {},
      lastNotifiedAppErrors: {},
    }
  }
}

async function updateDeploymentState(state: DeploymentState) {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant) return

  const currentSettings = tenant.settings ? JSON.parse(tenant.settings) : {}
  const updatedSettings = {
    ...currentSettings,
    deploymentState: state,
    lastDeploymentCheck: new Date().toISOString(),
  }

  await prisma.tenants.update({
    where: { id: BigInt(1) },
    data: { settings: JSON.stringify(updatedSettings) },
  })
}

async function fetchFromDokploy(
  server: (typeof DOKPLOY_SERVERS)[0],
  endpoint: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const input = JSON.stringify({ json: params })
  const url = `${server.url}/api/trpc/${endpoint}?input=${encodeURIComponent(input)}`

  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": server.token,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.result?.data?.json ?? data.result?.data ?? null
  } catch {
    return null
  }
}

async function getProjectsWithApps(server: (typeof DOKPLOY_SERVERS)[0]) {
  const projects = (await fetchFromDokploy(server, "project.all")) as ProjectData[] | null
  if (!projects) return []

  const apps: Array<{
    server: string
    serverId: number
    serverUrl: string
    projectName: string
    app: Application
    type: "application" | "compose"
  }> = []

  for (const project of projects) {
    for (const env of project.environments || []) {
      for (const app of env.applications || []) {
        apps.push({
          server: server.name,
          serverId: server.id,
          serverUrl: server.url,
          projectName: project.name,
          app,
          type: "application",
        })
      }
      for (const compose of env.compose || []) {
        apps.push({
          server: server.name,
          serverId: server.id,
          serverUrl: server.url,
          projectName: project.name,
          app: {
            applicationId: compose.composeId,
            name: compose.name,
            appName: compose.appName,
            applicationStatus: compose.composeStatus,
            repository: null,
            owner: null,
            branch: null,
          },
          type: "compose",
        })
      }
    }
  }

  return apps
}

async function getRecentDeployments(
  server: (typeof DOKPLOY_SERVERS)[0],
  applicationId: string,
  type: "application" | "compose"
): Promise<Deployment[]> {
  const params = type === "application" ? { applicationId } : { composeId: applicationId }
  const deployments = (await fetchFromDokploy(server, "deployment.all", params)) as
    | Deployment[]
    | null
  return (deployments || []).slice(0, 5)
}

// GET: Cron job endpoint - runs every 2-5 minutes
export async function GET() {
  try {
    console.log("[Cron] Starting deployment monitor...")

    const notificationSettings = await getDeploymentNotificationSettings()
    const slackConfig = await getSlackConfig()
    const cloudflareConfig = await getCloudflareConfig()

    if (!notificationSettings.enabled) {
      console.log("[Cron] Deployment notifications disabled")
      return NextResponse.json({
        success: false,
        message: "Deployment notifications disabled",
      })
    }

    if (!slackConfig || !slackConfig.slackEnabled) {
      console.log("[Cron] Slack not configured")
      return NextResponse.json({
        success: false,
        message: "Slack not configured",
      })
    }

    const state = await getDeploymentState()
    const newState: DeploymentState = {
      lastCheckedDeployments: { ...state.lastCheckedDeployments },
      lastNotifiedAppErrors: { ...state.lastNotifiedAppErrors },
    }

    let notificationsSent = 0
    let deploymentsChecked = 0
    let appsInError = 0
    let cachesPurged = 0

    // Check all servers in parallel
    const allAppsPromises = DOKPLOY_SERVERS.map((server) => getProjectsWithApps(server))
    const allAppsResults = await Promise.all(allAppsPromises)
    const allApps = allAppsResults.flat()

    // Get deployments for apps in batches
    const batchSize = 15
    const allDeployments: Array<{
      deployment: Deployment
      app: (typeof allApps)[0]
    }> = []

    for (let i = 0; i < allApps.length; i += batchSize) {
      const batch = allApps.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (appInfo) => {
          const server = DOKPLOY_SERVERS.find((s) => s.id === appInfo.serverId)!
          const deployments = await getRecentDeployments(
            server,
            appInfo.app.applicationId,
            appInfo.type
          )
          return deployments.map((d) => ({ deployment: d, app: appInfo }))
        })
      )
      allDeployments.push(...batchResults.flat())
    }

    // Check for deployment status changes
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    for (const { deployment, app } of allDeployments) {
      deploymentsChecked++
      const deploymentKey = `${app.serverId}-${deployment.deploymentId}`
      const previousStatus = state.lastCheckedDeployments[deploymentKey]

      // Only process recent deployments (last hour)
      const deploymentTime = new Date(deployment.createdAt).getTime()
      if (deploymentTime < oneHourAgo) continue

      // Check if status changed to done or error
      if (previousStatus && previousStatus !== deployment.status) {
        if (deployment.status === "done") {
          // Deployment succeeded
          const duration =
            deployment.finishedAt && deployment.startedAt
              ? Math.round(
                  (new Date(deployment.finishedAt).getTime() -
                    new Date(deployment.startedAt).getTime()) /
                    1000
                )
              : null

          // Purge Cloudflare cache if enabled
          if (cloudflareConfig?.enabled && cloudflareConfig.purgeOnDeploy && app.type === "application") {
            const server = DOKPLOY_SERVERS.find((s) => s.id === app.serverId)!
            const domains = await getAppDomains(server, app.app.applicationId)

            if (domains.length > 0) {
              const purgeResult = await purgeCloudflareCache(cloudflareConfig, domains)
              if (purgeResult.purged.length > 0) {
                cachesPurged += purgeResult.purged.length
                console.log(`[Cron] Cache purged for ${app.app.name}: ${purgeResult.purged.join(", ")}`)
              }
            }
          }

          // Send Slack notification if enabled
          if (notificationSettings.notifyOnSuccess) {
            await notifyDeploymentSuccess(slackConfig, {
              appName: app.app.name,
              projectName: app.projectName,
              serverName: app.server,
              status: "done",
              duration,
              serverUrl: app.serverUrl,
              repository: app.app.repository,
              branch: app.app.branch,
            })
            notificationsSent++
            console.log(`[Cron] Notified: ${app.app.name} deployment succeeded on ${app.server}`)
          }
        } else if (deployment.status === "error" && notificationSettings.notifyOnFailure) {
          // Deployment failed
          await notifyDeploymentFailure(slackConfig, {
            appName: app.app.name,
            projectName: app.projectName,
            serverName: app.server,
            status: "error",
            errorMessage: deployment.errorMessage,
            serverUrl: app.serverUrl,
            repository: app.app.repository,
            branch: app.app.branch,
          })
          notificationsSent++
          console.log(`[Cron] Notified: ${app.app.name} deployment failed on ${app.server}`)
        }
      }

      // Update state
      newState.lastCheckedDeployments[deploymentKey] = deployment.status
    }

    // Check for apps in error state
    if (notificationSettings.notifyOnAppError) {
      const errorCooldown = 30 * 60 * 1000 // 30 minutes cooldown between notifications

      for (const appInfo of allApps) {
        if (appInfo.app.applicationStatus === "error") {
          appsInError++
          const appKey = `${appInfo.serverId}-${appInfo.app.applicationId}`
          const lastNotified = state.lastNotifiedAppErrors[appKey] || 0

          // Only notify if not notified recently
          if (now - lastNotified > errorCooldown) {
            await notifyAppError(slackConfig, {
              appName: appInfo.app.name,
              projectName: appInfo.projectName,
              serverName: appInfo.server,
              status: appInfo.app.applicationStatus,
              serverUrl: appInfo.serverUrl,
            })
            notificationsSent++
            newState.lastNotifiedAppErrors[appKey] = now
            console.log(`[Cron] Notified: ${appInfo.app.name} in error state on ${appInfo.server}`)
          }
        }
      }
    }

    // Cleanup old entries (keep last 24h of deployments)
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    for (const [key, timestamp] of Object.entries(newState.lastNotifiedAppErrors)) {
      if (timestamp < oneDayAgo) {
        delete newState.lastNotifiedAppErrors[key]
      }
    }

    // Keep only last 500 deployment states
    const deploymentKeys = Object.keys(newState.lastCheckedDeployments)
    if (deploymentKeys.length > 500) {
      const keysToRemove = deploymentKeys.slice(0, deploymentKeys.length - 500)
      for (const key of keysToRemove) {
        delete newState.lastCheckedDeployments[key]
      }
    }

    // Save state
    await updateDeploymentState(newState)

    console.log(
      `[Cron] Monitor complete: ${deploymentsChecked} deployments, ${appsInError} apps in error, ${notificationsSent} notifications sent, ${cachesPurged} caches purged`
    )

    return NextResponse.json({
      success: true,
      message: `Monitor complete: ${notificationsSent} notifications sent, ${cachesPurged} caches purged`,
      stats: {
        deploymentsChecked,
        appsInError,
        notificationsSent,
        cachesPurged,
        serversChecked: DOKPLOY_SERVERS.length,
      },
    })
  } catch (error) {
    console.error("[Cron] Deployment monitor error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Monitor error",
      },
      { status: 500 }
    )
  }
}
