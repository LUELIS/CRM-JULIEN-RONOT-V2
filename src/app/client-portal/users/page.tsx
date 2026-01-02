"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Users,
  UserPlus,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
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

export default function ClientPortalUsersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [users, setUsers] = useState<ClientUser[]>([])
  const [isPrimaryUser, setIsPrimaryUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" })
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/client-portal/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setIsPrimaryUser(data.isPrimaryUser)
      } else if (response.status === 403) {
        router.push("/client-portal")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsInviting(true)

    try {
      const response = await fetch("/api/client-portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      })

      const data = await response.json()

      if (response.ok) {
        setShowInviteDialog(false)
        setInviteForm({ name: "", email: "" })
        fetchUsers()
      } else {
        setError(data.error || "Erreur lors de l'invitation")
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsInviting(false)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/client-portal/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error toggling user:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer l'utilisateur ${userName} ?`)) return

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/client-portal/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error deleting user:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const statusBadge = (status: ClientUser["status"]) => {
    const styles = {
      active: { bg: "#E8F8EE", color: "#28B95F", label: "Actif", Icon: CheckCircle },
      inactive: { bg: "#F5F5F7", color: "#666666", label: "Inactif", Icon: XCircle },
      invited: { bg: "#E6F0FF", color: "#0064FA", label: "Invité", Icon: Clock },
    }
    const s = styles[status]
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
        style={{ background: s.bg, color: s.color }}
      >
        <s.Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  // Redirect non-primary users
  if (!isPrimaryUser) {
    return (
      <div className="text-center py-12">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "#FEE2E8" }}
        >
          <AlertCircle className="w-8 h-8" style={{ color: "#F04B69" }} />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
          Accès restreint
        </h2>
        <p className="text-sm" style={{ color: "#666666" }}>
          Seul l'utilisateur principal peut gérer les utilisateurs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
            Utilisateurs
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Gérez les accès à votre espace client
          </p>
        </div>
        <button
          onClick={() => setShowInviteDialog(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: "#0064FA" }}
        >
          <UserPlus className="w-4 h-4" />
          Inviter un utilisateur
        </button>
      </div>

      {/* Users List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "#F5F5F7" }}
            >
              <Users className="w-8 h-8" style={{ color: "#AEAEAE" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
              Aucun utilisateur
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Invitez des collègues pour leur donner accès à cet espace.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
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
                                  Vous
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
                        {!user.isPrimaryUser && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleActive(user.id, user.isActive)}
                              disabled={actionLoading === user.id}
                              className="p-2 rounded-lg transition-colors hover:bg-[#E6F0FF]"
                              style={{ color: user.isActive ? "#28B95F" : "#666666" }}
                              title={user.isActive ? "Désactiver" : "Activer"}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.isActive ? (
                                <ToggleRight className="w-5 h-5" />
                              ) : (
                                <ToggleLeft className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
                              disabled={actionLoading === user.id}
                              className="p-2 rounded-lg transition-colors hover:bg-[#FEE2E8]"
                              style={{ color: "#F04B69" }}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y" style={{ borderColor: "#EEEEEE" }}>
              {users.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
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
                        <p className="font-medium" style={{ color: "#111111" }}>
                          {user.name}
                        </p>
                        <p className="text-xs" style={{ color: "#666666" }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {statusBadge(user.status)}
                  </div>
                  {!user.isPrimaryUser && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "#EEEEEE" }}>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        disabled={actionLoading === user.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: "#F5F5F7", color: "#666666" }}
                      >
                        {user.isActive ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={actionLoading === user.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: "#FEE2E8", color: "#F04B69" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={{ background: "#FFFFFF" }}
          >
            <h3 className="text-lg font-semibold mb-1" style={{ color: "#111111" }}>
              Inviter un utilisateur
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Cette personne recevra un email pour créer son compte.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                  Nom complet
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Marie Martin"
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
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="marie@entreprise.com"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>

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
                    setShowInviteDialog(false)
                    setError("")
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#0064FA" }}
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Inviter
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
