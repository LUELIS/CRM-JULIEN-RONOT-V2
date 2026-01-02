"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Users,
  UserPlus,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  LogIn,
  Loader2,
  Mail,
  MoreVertical,
  RefreshCw,
} from "lucide-react"

interface ClientUser {
  id: string
  name: string
  email: string
  isActive: boolean
  isPrimaryUser: boolean
  lastLoginAt: string | null
  createdAt: string | null
  status: "active" | "inactive" | "invited"
}

interface ClientUsersTabProps {
  clientId: string
  clientName: string
}

export function ClientUsersTab({ clientId, clientName }: ClientUsersTabProps) {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [users, setUsers] = useState<ClientUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    sendInvitation: true,
  })
  const [error, setError] = useState("")

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [clientId])

  const hasPrimaryUser = users.some((u) => u.isPrimaryUser)

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsCreating(true)

    try {
      const response = await fetch(`/api/clients/${clientId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateDialog(false)
        setCreateForm({ name: "", email: "", sendInvitation: true })
        fetchUsers()
      } else {
        setError(data.error || "Erreur lors de la création")
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsCreating(false)
    }
  }

  const handleImpersonate = async () => {
    setIsImpersonating(true)
    try {
      const response = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      })

      const data = await response.json()

      if (response.ok && data.impersonate) {
        // Update session with impersonation data
        await updateSession({ impersonate: data.impersonate })
        // Navigate to client portal
        router.push("/client-portal")
      } else {
        setError(data.error || "Erreur lors de l'impersonation")
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsImpersonating(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  const statusBadge = (status: ClientUser["status"]) => {
    const styles = {
      active: { bg: "#E8F8EE", color: "#28B95F", label: "Actif" },
      inactive: { bg: "#F5F5F7", color: "#666666", label: "Inactif" },
      invited: { bg: "#E6F0FF", color: "#0064FA", label: "Invité" },
    }
    const s = styles[status]
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
        style={{ background: s.bg, color: s.color }}
      >
        {status === "active" && <CheckCircle className="w-3 h-3" />}
        {status === "inactive" && <XCircle className="w-3 h-3" />}
        {status === "invited" && <Clock className="w-3 h-3" />}
        {s.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
            Utilisateurs du client
          </h3>
          <p className="text-sm" style={{ color: "#666666" }}>
            Gérez les accès au portail client
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPrimaryUser && (
            <button
              onClick={handleImpersonate}
              disabled={isImpersonating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#FFF9E6", color: "#DCB40A" }}
            >
              {isImpersonating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Se connecter en tant que
            </button>
          )}
          {!hasPrimaryUser && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: "#0064FA" }}
            >
              <UserPlus className="w-4 h-4" />
              Créer l'utilisateur principal
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: "#FEE2E8", color: "#F04B69" }}
        >
          <XCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">×</button>
        </div>
      )}

      {/* Users List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#0064FA" }} />
            <p className="text-sm" style={{ color: "#666666" }}>Chargement...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "#F5F5F7" }}
            >
              <Users className="w-8 h-8" style={{ color: "#AEAEAE" }} />
            </div>
            <h4 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
              Aucun utilisateur
            </h4>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Ce client n'a pas encore d'accès au portail client.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: "#0064FA" }}
            >
              <UserPlus className="w-4 h-4" />
              Créer l'utilisateur principal
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F5F5F7" }}>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Utilisateur
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Statut
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Dernière connexion
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#EEEEEE" }}>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#F5F5F7] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm"
                        style={{
                          background: user.isPrimaryUser ? "#FFF9E6" : "#F5F5F7",
                          color: user.isPrimaryUser ? "#DCB40A" : "#666666",
                        }}
                      >
                        {user.isPrimaryUser ? (
                          <Crown className="w-5 h-5" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" style={{ color: "#111111" }}>
                            {user.name}
                          </p>
                          {user.isPrimaryUser && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: "#FFF9E6", color: "#DCB40A" }}
                            >
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: "#666666" }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {statusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: "#666666" }}>
                      {formatDate(user.lastLoginAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.status === "invited" && (
                      <button
                        className="p-2 rounded-lg transition-colors hover:bg-[#E6F0FF]"
                        style={{ color: "#0064FA" }}
                        title="Renvoyer l'invitation"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md mx-4 p-6 rounded-2xl"
            style={{ background: "#FFFFFF" }}
          >
            <h3 className="text-lg font-semibold mb-1" style={{ color: "#111111" }}>
              Créer l'utilisateur principal
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Cet utilisateur pourra inviter d'autres personnes de son entreprise.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                  Nom complet
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Jean Dupont"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="jean@entreprise.com"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.sendInvitation}
                  onChange={(e) => setCreateForm({ ...createForm, sendInvitation: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm" style={{ color: "#444444" }}>
                  Envoyer une invitation par email
                </span>
              </label>

              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#FEE2E8", color: "#F04B69" }}
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setError("")
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#0064FA" }}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Créer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
