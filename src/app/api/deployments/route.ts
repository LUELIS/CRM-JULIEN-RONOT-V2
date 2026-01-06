import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface DokployServer {
  id: bigint
  name: string
  url: string
  apiToken: string
  isActive: boolean
}

interface Application {
  applicationId: string
  name: string
  appName: string
  description: string | null
  applicationStatus: string
  sourceType: string
  repository: string | null
  owner: string | null
  branch: string | null
}

interface Deployment {
  deploymentId: string
  title: string
  description: string
  status: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  applicationId: string
  logPath: string | null
}

interface ProjectData {
  projectId: string
  name: string
  environments: {
    environmentId: string
    name: string
    applications: Application[]
    compose: Array<{
      composeId: string
      name: string
      appName: string
      composeStatus: string
    }>
  }[]
}

async function getDokployServers(): Promise<DokployServer[]> {
  try {
    const servers = await prisma.dokployServer.findMany({
      where: {
        tenant_id: BigInt(1),
        isActive: true,
      },
      orderBy: { name: "asc" },
    })
    return servers
  } catch (error) {
    console.error("Error fetching Dokploy servers from DB:", error)
    return []
  }
}

async function fetchFromDokploy(
  server: DokployServer,
  endpoint: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  // tRPC expects input wrapped in {json: {...}}
  const input = JSON.stringify({ json: params })
  const url = `${server.url}/api/trpc/${endpoint}?input=${encodeURIComponent(input)}`

  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": server.apiToken,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      console.error(`Error fetching from ${server.name}:`, res.status)
      return null
    }

    const data = await res.json()
    return data.result?.data?.json ?? data.result?.data ?? null
  } catch (error) {
    console.error(`Error fetching from ${server.name}:`, error)
    return null
  }
}

async function getServerHealth(server: DokployServer): Promise<boolean> {
  try {
    // Use project.all as a health check endpoint
    const res = await fetch(`${server.url}/api/trpc/project.all`, {
      headers: { "x-api-key": server.apiToken },
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function getProjectsWithApps(server: DokployServer) {
  const projects = (await fetchFromDokploy(server, "project.all")) as ProjectData[] | null
  if (!projects) return []

  const apps: Array<{
    server: string
    serverId: string
    projectName: string
    projectId: string
    app: Application
    type: "application" | "compose"
  }> = []

  for (const project of projects) {
    for (const env of project.environments || []) {
      for (const app of env.applications || []) {
        apps.push({
          server: server.name,
          serverId: server.id.toString(),
          projectName: project.name,
          projectId: project.projectId,
          app,
          type: "application",
        })
      }
      for (const compose of env.compose || []) {
        apps.push({
          server: server.name,
          serverId: server.id.toString(),
          projectName: project.name,
          projectId: project.projectId,
          app: {
            applicationId: compose.composeId,
            name: compose.name,
            appName: compose.appName,
            description: null,
            applicationStatus: compose.composeStatus,
            sourceType: "compose",
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
  server: DokployServer,
  applicationId: string,
  type: "application" | "compose"
): Promise<Deployment[]> {
  const endpoint = type === "application" ? "deployment.all" : "deployment.all"
  const params =
    type === "application"
      ? { applicationId }
      : { composeId: applicationId }

  const deployments = (await fetchFromDokploy(server, endpoint, params)) as Deployment[] | null
  return deployments || []
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const serverFilter = searchParams.get("server")
  const statusFilter = searchParams.get("status")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    // Fetch servers from database
    const dokployServers = await getDokployServers()

    if (dokployServers.length === 0) {
      return NextResponse.json({
        servers: [],
        deployments: [],
        catalog: [],
        stats: { total: 0, running: 0, done: 0, error: 0 },
        message: "Aucun serveur Dokploy configuré. Allez dans Paramètres > Intégrations > Dokploy pour en ajouter.",
      })
    }

    // Check server health in parallel
    const healthChecks = await Promise.all(
      dokployServers.map(async (server) => ({
        ...server,
        online: await getServerHealth(server),
      }))
    )

    // Filter servers if specified
    const serversToQuery = serverFilter
      ? healthChecks.filter((s) => s.name.toLowerCase() === serverFilter.toLowerCase())
      : healthChecks.filter((s) => s.online)

    // Get all apps from all servers in parallel
    const allAppsPromises = serversToQuery.map((server) => getProjectsWithApps(server))
    const allAppsResults = await Promise.all(allAppsPromises)
    const allApps = allAppsResults.flat()

    // Get deployments for ALL apps (no filtering/sampling)
    const appsToCheck = allApps

    // Fetch deployments in parallel (batch of 10 at a time)
    const allDeployments: Array<{
      deployment: Deployment
      app: (typeof allApps)[0]
      serverUrl: string
    }> = []

    const batchSize = 20
    for (let i = 0; i < appsToCheck.length; i += batchSize) {
      const batch = appsToCheck.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (appInfo) => {
          const server = dokployServers.find((s) => s.id.toString() === appInfo.serverId)!
          const deployments = await getRecentDeployments(
            server,
            appInfo.app.applicationId,
            appInfo.type
          )
          return deployments.slice(0, 5).map((d) => ({
            deployment: d,
            app: appInfo,
            serverUrl: server.url,
          }))
        })
      )
      allDeployments.push(...batchResults.flat())
    }

    // Sort by createdAt desc
    allDeployments.sort(
      (a, b) =>
        new Date(b.deployment.createdAt).getTime() -
        new Date(a.deployment.createdAt).getTime()
    )

    // Filter by status if specified
    let filteredDeployments = allDeployments
    if (statusFilter) {
      filteredDeployments = allDeployments.filter(
        (d) => d.deployment.status === statusFilter
      )
    }

    // Format response
    const deployments = filteredDeployments.slice(0, limit).map((d) => ({
      id: d.deployment.deploymentId,
      title: d.deployment.title,
      description: d.deployment.description,
      status: d.deployment.status,
      createdAt: d.deployment.createdAt,
      startedAt: d.deployment.startedAt,
      finishedAt: d.deployment.finishedAt,
      errorMessage: d.deployment.errorMessage,
      duration: d.deployment.finishedAt && d.deployment.startedAt
        ? Math.round(
            (new Date(d.deployment.finishedAt).getTime() -
              new Date(d.deployment.startedAt).getTime()) /
              1000
          )
        : null,
      server: d.app.server,
      serverId: d.app.serverId,
      serverUrl: d.serverUrl,
      projectName: d.app.projectName,
      appName: d.app.app.name,
      appId: d.app.app.applicationId,
      appType: d.app.type,
      appStatus: d.app.app.applicationStatus,
      repository: d.app.app.repository,
      owner: d.app.app.owner,
      branch: d.app.app.branch,
      logPath: d.deployment.logPath,
    }))

    // Get running deployments count per server (only count errors if app is currently in error state)
    const runningByServer = healthChecks.map((server) => ({
      name: server.name,
      id: server.id.toString(),
      online: server.online,
      running: deployments.filter(
        (d) => d.server === server.name && d.status === "running"
      ).length,
      errors: deployments.filter(
        (d) => d.server === server.name && d.status === "error" && d.appStatus === "error"
      ).length,
    }))

    // Build consolidated apps catalog (one entry per unique app name)
    const appsCatalog = new Map<string, {
      name: string
      projectName: string
      type: "application" | "compose"
      repository: string | null
      owner: string | null
      branch: string | null
      servers: {
        serverId: string
        serverName: string
        serverUrl: string
        appId: string
        status: string
        lastDeployment: {
          id: string
          status: string
          createdAt: string
          duration: number | null
        } | null
      }[]
    }>()

    for (const appInfo of allApps) {
      const key = `${appInfo.app.name}-${appInfo.projectName}`

      // Find last deployment for this app on this server
      const appDeployments = allDeployments.filter(
        d => d.app.app.applicationId === appInfo.app.applicationId && d.app.serverId === appInfo.serverId
      )
      const lastDeployment = appDeployments[0]

      const serverInfo = {
        serverId: appInfo.serverId,
        serverName: appInfo.server,
        serverUrl: dokployServers.find(s => s.id.toString() === appInfo.serverId)?.url || "",
        appId: appInfo.app.applicationId,
        status: appInfo.app.applicationStatus,
        lastDeployment: lastDeployment ? {
          id: lastDeployment.deployment.deploymentId,
          status: lastDeployment.deployment.status,
          createdAt: lastDeployment.deployment.createdAt,
          duration: lastDeployment.deployment.finishedAt && lastDeployment.deployment.startedAt
            ? Math.round(
                (new Date(lastDeployment.deployment.finishedAt).getTime() -
                  new Date(lastDeployment.deployment.startedAt).getTime()) /
                  1000
              )
            : null,
        } : null,
      }

      if (appsCatalog.has(key)) {
        appsCatalog.get(key)!.servers.push(serverInfo)
      } else {
        appsCatalog.set(key, {
          name: appInfo.app.name,
          projectName: appInfo.projectName,
          type: appInfo.type,
          repository: appInfo.app.repository,
          owner: appInfo.app.owner,
          branch: appInfo.app.branch,
          servers: [serverInfo],
        })
      }
    }

    // Convert to array and sort by name
    const catalogArray = Array.from(appsCatalog.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return NextResponse.json({
      servers: runningByServer,
      deployments,
      catalog: catalogArray,
      stats: {
        total: deployments.length,
        running: deployments.filter((d) => d.status === "running").length,
        done: deployments.filter((d) => d.status === "done").length,
        error: deployments.filter((d) => d.status === "error" && d.appStatus === "error").length,
      },
    })
  } catch (error) {
    console.error("Error fetching deployments:", error)
    return NextResponse.json(
      { error: "Failed to fetch deployments" },
      { status: 500 }
    )
  }
}

// POST - Trigger actions (redeploy, cancel)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, serverId, appId, appType } = body

    // Fetch server from database
    const server = await prisma.dokployServer.findFirst({
      where: {
        id: BigInt(serverId),
        tenant_id: BigInt(1),
        isActive: true,
      },
    })

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }

    let endpoint: string
    let params: Record<string, string>

    switch (action) {
      case "redeploy":
        endpoint = appType === "compose" ? "compose.deploy" : "application.redeploy"
        params = appType === "compose" ? { composeId: appId } : { applicationId: appId }
        break
      case "cancel":
        endpoint = "deployment.cancel"
        params = appType === "compose"
          ? { composeId: appId }
          : { applicationId: appId }
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Make mutation request to Dokploy
    const url = `${server.url}/api/trpc/${endpoint}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": server.apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ json: params }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("Dokploy error:", errorText)
      return NextResponse.json(
        { error: "Failed to execute action" },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error executing action:", error)
    return NextResponse.json(
      { error: "Failed to execute action" },
      { status: 500 }
    )
  }
}
