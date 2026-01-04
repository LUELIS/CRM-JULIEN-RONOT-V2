"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  Square,
  GitBranch,
  ExternalLink,
  Filter,
  Search,
  Rocket,
  AlertTriangle,
  Timer,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ServerStatus {
  name: string
  id: number
  online: boolean
  running: number
  errors: number
}

interface Deployment {
  id: string
  title: string
  description: string
  status: "running" | "done" | "error" | "queued"
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  duration: number | null
  server: string
  serverId: number
  serverUrl: string
  projectName: string
  appName: string
  appId: string
  appType: "application" | "compose"
  repository: string | null
  owner: string | null
  branch: string | null
  logPath: string | null
}

interface DeploymentData {
  servers: ServerStatus[]
  deployments: Deployment[]
  stats: {
    total: number
    running: number
    done: number
    error: number
  }
}

export default function DeploymentsPage() {
  const [data, setData] = useState<DeploymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [serverFilter, setServerFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchDeployments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (serverFilter) params.set("server", serverFilter)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/deployments?${params.toString()}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error("Error fetching deployments:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [serverFilter, statusFilter])

  useEffect(() => {
    fetchDeployments()
  }, [fetchDeployments])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDeployments(true)
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchDeployments])

  const handleAction = async (
    action: "redeploy" | "cancel",
    deployment: Deployment
  ) => {
    setActionLoading(deployment.id)
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          serverId: deployment.serverId,
          appId: deployment.appId,
          appType: deployment.appType,
        }),
      })

      if (res.ok) {
        // Refresh after action
        setTimeout(() => fetchDeployments(true), 1000)
      } else {
        alert("Erreur lors de l'exécution de l'action")
      }
    } catch (error) {
      console.error("Error executing action:", error)
      alert("Erreur de connexion")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins}min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Il y a ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `Il y a ${diffDays}j`
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "running":
        return {
          label: "En cours",
          icon: Loader2,
          color: "#0064FA",
          bg: "#E6F0FF",
          animate: true,
        }
      case "done":
        return {
          label: "Terminé",
          icon: CheckCircle2,
          color: "#28B95F",
          bg: "#E6F9EE",
          animate: false,
        }
      case "error":
        return {
          label: "Erreur",
          icon: XCircle,
          color: "#EF4444",
          bg: "#FEE2E2",
          animate: false,
        }
      case "queued":
        return {
          label: "En attente",
          icon: Clock,
          color: "#F59E0B",
          bg: "#FEF3C7",
          animate: false,
        }
      default:
        return {
          label: status,
          icon: Clock,
          color: "#6B7280",
          bg: "#F3F4F6",
          animate: false,
        }
    }
  }

  const filteredDeployments = data?.deployments.filter((d) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        d.appName.toLowerCase().includes(query) ||
        d.projectName.toLowerCase().includes(query) ||
        d.title.toLowerCase().includes(query) ||
        d.repository?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const runningDeployments = filteredDeployments?.filter(
    (d) => d.status === "running"
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0064FA]" />
          <p className="text-gray-500">Chargement des déploiements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Rocket className="h-6 w-6 text-[#0064FA]" />
              Suivi des Déploiements
            </h1>
            <p className="text-gray-500 mt-1">
              Vue consolidée de vos 3 serveurs Dokploy
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                autoRefresh
                  ? "bg-[#E6F0FF] text-[#0064FA]"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <Activity className={cn("h-4 w-4", autoRefresh && "animate-pulse")} />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => fetchDeployments(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#0064FA] text-white rounded-xl text-sm font-medium hover:bg-[#0052CC] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Server Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.servers.map((server) => (
            <div
              key={server.id}
              className={cn(
                "bg-white rounded-xl border p-4 transition-all cursor-pointer",
                serverFilter === server.name
                  ? "border-[#0064FA] ring-2 ring-[#0064FA]/20"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() =>
                setServerFilter(serverFilter === server.name ? "" : server.name)
              }
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{server.name}</span>
                </div>
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    server.online ? "bg-green-500" : "bg-red-500"
                  )}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                {server.running > 0 && (
                  <div className="flex items-center gap-1 text-[#0064FA]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{server.running} en cours</span>
                  </div>
                )}
                {server.errors > 0 && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{server.errors} erreurs</span>
                  </div>
                )}
                {server.running === 0 && server.errors === 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Tout est OK</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        {data?.stats && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Total:</span>
              <span className="font-medium">{data.stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0064FA]" />
              <span className="text-gray-500">En cours:</span>
              <span className="font-medium">{data.stats.running}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500">Terminés:</span>
              <span className="font-medium">{data.stats.done}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-500">Erreurs:</span>
              <span className="font-medium">{data.stats.error}</span>
            </div>
            {lastRefresh && (
              <div className="ml-auto text-gray-400 text-xs">
                Dernière mise à jour: {lastRefresh.toLocaleTimeString("fr-FR")}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une app, projet..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="running">En cours</option>
              <option value="done">Terminés</option>
              <option value="error">Erreurs</option>
            </select>
          </div>

          {(serverFilter || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setServerFilter("")
                setStatusFilter("")
                setSearchQuery("")
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Running Deployments - Priority Section */}
      {runningDeployments && runningDeployments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#0064FA]" />
            Déploiements en cours ({runningDeployments.length})
          </h2>
          <div className="space-y-3">
            {runningDeployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                onAction={handleAction}
                actionLoading={actionLoading}
                formatDuration={formatDuration}
                formatTimeAgo={formatTimeAgo}
                getStatusConfig={getStatusConfig}
                highlighted
              />
            ))}
          </div>
        </div>
      )}

      {/* All Deployments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Historique des déploiements
        </h2>
        {filteredDeployments && filteredDeployments.length > 0 ? (
          <div className="space-y-2">
            {filteredDeployments
              .filter((d) => d.status !== "running")
              .map((deployment) => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  formatDuration={formatDuration}
                  formatTimeAgo={formatTimeAgo}
                  getStatusConfig={getStatusConfig}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <Rocket className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun déploiement trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DeploymentCard({
  deployment,
  onAction,
  actionLoading,
  formatDuration,
  formatTimeAgo,
  getStatusConfig,
  highlighted = false,
}: {
  deployment: Deployment
  onAction: (action: "redeploy" | "cancel", deployment: Deployment) => void
  actionLoading: string | null
  formatDuration: (seconds: number | null) => string
  formatTimeAgo: (dateStr: string) => string
  getStatusConfig: (status: string) => {
    label: string
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    color: string
    bg: string
    animate: boolean
  }
  highlighted?: boolean
}) {
  const statusConfig = getStatusConfig(deployment.status)
  const StatusIcon = statusConfig.icon

  // Clean commit message (remove long descriptions)
  const title = deployment.title.split("\n")[0].slice(0, 80)

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 transition-all",
        highlighted
          ? "border-[#0064FA] shadow-lg shadow-[#0064FA]/10"
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: statusConfig.bg }}
        >
          <StatusIcon
            className={cn(
              "h-5 w-5",
              statusConfig.animate && "animate-spin"
            )}
            style={{ color: statusConfig.color }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {deployment.appName}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: statusConfig.bg,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {deployment.server}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate" title={deployment.title}>
                {title || "Manual deployment"}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{deployment.projectName}</span>
                {deployment.repository && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {deployment.owner}/{deployment.repository}
                    {deployment.branch && `:${deployment.branch}`}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {deployment.status === "running" ? (
                <button
                  onClick={() => onAction("cancel", deployment)}
                  disabled={actionLoading === deployment.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === deployment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  Annuler
                </button>
              ) : (
                <button
                  onClick={() => onAction("redeploy", deployment)}
                  disabled={actionLoading === deployment.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0064FA] bg-[#E6F0FF] hover:bg-[#CCE0FF] rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === deployment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Redéployer
                </button>
              )}
              <a
                href={`${deployment.serverUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Ouvrir dans Dokploy"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Progress bar for running */}
          {deployment.status === "running" && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0064FA] rounded-full animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(deployment.createdAt)}
            </span>
            {deployment.duration !== null && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {formatDuration(deployment.duration)}
              </span>
            )}
            {deployment.errorMessage && (
              <span className="text-red-500 truncate flex-1">
                {deployment.errorMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
