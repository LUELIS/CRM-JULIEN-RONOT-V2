"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  BarChart2,
  Users,
  Edit2,
  Globe,
  Send,
} from "lucide-react"

interface MySendmailAccount {
  id: string
  email: string
  active: boolean
  createdAt: string
}

interface MySendmailDomain {
  id: string
  name: string
  dailyLimit: number
  monthlyLimit: number
  dailySent: number
  monthlySent: number
  active: boolean
  accounts: MySendmailAccount[]
  createdAt: string
}

interface MySendmailStats {
  totalReceived: number
  totalSent: number
  totalBlocked: number
  totalFailed: number
  avgPhishingScore: number
  avgSpamScore: number
}

interface TestResult {
  type: "success" | "error"
  message: string
  domains?: number
}

export function MySendmailSettings() {
  // Configuration state
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Domains state
  const [domains, setDomains] = useState<MySendmailDomain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(false)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null)

  // Domain form state
  const [showDomainForm, setShowDomainForm] = useState(false)
  const [editingDomain, setEditingDomain] = useState<MySendmailDomain | null>(null)
  const [domainName, setDomainName] = useState("")
  const [dailyLimit, setDailyLimit] = useState("1000")
  const [monthlyLimit, setMonthlyLimit] = useState("30000")
  const [savingDomain, setSavingDomain] = useState(false)
  const [deletingDomainId, setDeletingDomainId] = useState<string | null>(null)

  // Account form state
  const [showAccountForm, setShowAccountForm] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<MySendmailAccount | null>(null)
  const [accountEmail, setAccountEmail] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [savingAccount, setSavingAccount] = useState(false)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)

  // Stats state
  const [stats, setStats] = useState<MySendmailStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  // Load config from settings
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setApiKey(data.settings?.mySendmailApiKey || "")
      }
    } catch (error) {
      console.error("Error fetching config:", error)
    } finally {
      setLoadingConfig(false)
    }
  }, [])

  // Load domains from My-Sendmail API
  const fetchDomains = useCallback(async () => {
    if (!apiKey) return
    setLoadingDomains(true)
    try {
      const res = await fetch("/api/settings/my-sendmail/domains")
      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
      }
    } catch (error) {
      console.error("Error fetching domains:", error)
    } finally {
      setLoadingDomains(false)
    }
  }, [apiKey])

  // Load stats
  const fetchStats = useCallback(async () => {
    if (!apiKey) return
    setLoadingStats(true)
    try {
      const res = await fetch("/api/settings/my-sendmail/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }, [apiKey])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    if (apiKey) {
      fetchDomains()
      fetchStats()
    }
  }, [apiKey, fetchDomains, fetchStats])

  // Test connection
  const handleTestConnection = async () => {
    if (!apiKey) {
      setTestResult({ type: "error", message: "Veuillez entrer une clé API" })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch("/api/settings/my-sendmail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      })

      const data = await res.json()

      if (res.ok) {
        setTestResult({
          type: "success",
          message: data.message,
          domains: data.domains,
        })
      } else {
        setTestResult({
          type: "error",
          message: data.error || "Erreur de connexion",
        })
      }
    } catch (error) {
      setTestResult({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur de connexion",
      })
    } finally {
      setTesting(false)
    }
  }

  // Save API key
  const handleSaveConfig = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "my-sendmail",
          mySendmailApiKey: apiKey,
          mySendmailEnabled: !!apiKey,
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        // Refresh domains after saving
        if (apiKey) {
          fetchDomains()
          fetchStats()
        }
      }
    } catch (error) {
      console.error("Error saving config:", error)
    } finally {
      setSaving(false)
    }
  }

  // Reset domain form
  const resetDomainForm = () => {
    setDomainName("")
    setDailyLimit("1000")
    setMonthlyLimit("30000")
    setEditingDomain(null)
    setShowDomainForm(false)
  }

  // Edit domain
  const handleEditDomain = (domain: MySendmailDomain) => {
    setEditingDomain(domain)
    setDomainName(domain.name)
    setDailyLimit(domain.dailyLimit.toString())
    setMonthlyLimit(domain.monthlyLimit.toString())
    setShowDomainForm(true)
  }

  // Create/Update domain
  const handleSubmitDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingDomain(true)

    try {
      const url = editingDomain
        ? `/api/settings/my-sendmail/domains/${editingDomain.id}`
        : "/api/settings/my-sendmail/domains"
      const method = editingDomain ? "PUT" : "POST"

      const body = editingDomain
        ? { dailyLimit: parseInt(dailyLimit), monthlyLimit: parseInt(monthlyLimit) }
        : { name: domainName, dailyLimit: parseInt(dailyLimit), monthlyLimit: parseInt(monthlyLimit) }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchDomains()
        resetDomainForm()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSavingDomain(false)
    }
  }

  // Delete domain
  const handleDeleteDomain = async (id: string) => {
    if (!confirm("Supprimer ce domaine et tous ses comptes ?")) return

    setDeletingDomainId(id)
    try {
      const res = await fetch(`/api/settings/my-sendmail/domains/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchDomains()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      alert("Erreur lors de la suppression")
    } finally {
      setDeletingDomainId(null)
    }
  }

  // Reset account form
  const resetAccountForm = () => {
    setAccountEmail("")
    setAccountPassword("")
    setEditingAccount(null)
    setShowAccountForm(null)
  }

  // Edit account
  const handleEditAccount = (domainId: string, account: MySendmailAccount) => {
    setEditingAccount(account)
    setAccountEmail(account.email)
    setAccountPassword("")
    setShowAccountForm(domainId)
  }

  // Create/Update account
  const handleSubmitAccount = async (e: React.FormEvent, domainId: string) => {
    e.preventDefault()
    setSavingAccount(true)

    try {
      const url = editingAccount
        ? `/api/settings/my-sendmail/domains/${domainId}/accounts/${editingAccount.id}`
        : `/api/settings/my-sendmail/domains/${domainId}/accounts`
      const method = editingAccount ? "PUT" : "POST"

      const body = editingAccount
        ? { password: accountPassword || undefined }
        : { email: accountEmail, password: accountPassword }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchDomains()
        resetAccountForm()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSavingAccount(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async (domainId: string, accountId: string) => {
    if (!confirm("Supprimer ce compte SMTP ?")) return

    setDeletingAccountId(accountId)
    try {
      const res = await fetch(`/api/settings/my-sendmail/domains/${domainId}/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchDomains()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      alert("Erreur lors de la suppression")
    } finally {
      setDeletingAccountId(null)
    }
  }

  // Progress bar component
  const ProgressBar = ({ current, max, color }: { current: number; max: number; color: string }) => {
    const percentage = Math.min((current / max) * 100, 100)
    const isWarning = percentage >= 80
    const isDanger = percentage >= 95

    return (
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#EEEEEE" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: isDanger ? "#F04B69" : isWarning ? "#F0783C" : color,
          }}
        />
      </div>
    )
  }

  // Stat card component
  const StatCard = ({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon?: React.ElementType }) => (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4" style={{ color }} />}
        <span className="text-2xl font-bold" style={{ color }}>
          {value.toLocaleString()}
        </span>
      </div>
      <span className="text-xs" style={{ color: "#666666" }}>
        {label}
      </span>
    </div>
  )

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Configuration API */}
      <div
        className="rounded-2xl p-6 w-full space-y-6"
        style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#FCE4EC" }}
          >
            <Mail className="h-5 w-5" style={{ color: "#F04B69" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
              My-Sendmail
            </h2>
            <p className="text-sm" style={{ color: "#666666" }}>
              Gérez vos domaines d&apos;envoi et comptes SMTP
            </p>
          </div>
        </div>

        {/* Info box */}
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: "#F0F7FF", border: "1px solid #CCE5FF" }}
        >
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#0064FA" }} />
            <div style={{ color: "#0064FA" }}>
              <strong>Configuration SMTP</strong>
              <br />
              Serveur: <code className="px-1 py-0.5 rounded" style={{ background: "#E3F2FD" }}>mail01.my-sendmail.fr</code>
              <br />
              Port: <code className="px-1 py-0.5 rounded" style={{ background: "#E3F2FD" }}>587</code> (STARTTLS)
              <br />
              Authentifiez-vous avec un compte du domaine.
            </div>
          </div>
        </div>

        {/* API Key input */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: "#111111" }}>
            Clé API My-Sendmail
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="msk_..."
                className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#666666" }}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testing || !apiKey}
              className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: "#F5F5F7", color: "#111111", border: "1px solid #EEEEEE" }}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Tester
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: testResult.type === "error" ? "#FEE2E8" : "#ECFDF5",
              border: `1px solid ${testResult.type === "error" ? "#FECDD3" : "#A7F3D0"}`,
            }}
          >
            {testResult.type === "error" ? (
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "#F04B69" }} />
            ) : (
              <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: "#28B95F" }} />
            )}
            <span
              className="text-sm"
              style={{ color: testResult.type === "error" ? "#F04B69" : "#28B95F" }}
            >
              {testResult.message}
            </span>
          </div>
        )}
      </div>

      {/* Section 2: Domains */}
      {apiKey && (
        <div
          className="rounded-2xl p-6 w-full space-y-4"
          style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#E8F5E9" }}
              >
                <Globe className="h-5 w-5" style={{ color: "#28B95F" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "#111111" }}>
                  Domaines
                </h3>
                <p className="text-sm" style={{ color: "#666666" }}>
                  {domains.length} domaine{domains.length > 1 ? "s" : ""} configuré{domains.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchDomains}
                disabled={loadingDomains}
                className="p-2 rounded-lg transition-colors"
                style={{ background: "#F5F5F7" }}
              >
                <RefreshCw className={`h-4 w-4 ${loadingDomains ? "animate-spin" : ""}`} style={{ color: "#666666" }} />
              </button>
              <button
                onClick={() => setShowDomainForm(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{ background: "#28B95F", color: "#FFFFFF" }}
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          </div>

          {/* Domain Form */}
          {showDomainForm && (
            <form
              onSubmit={handleSubmitDomain}
              className="rounded-xl p-4 space-y-4"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: "#111111" }}>
                  {editingDomain ? "Modifier le domaine" : "Nouveau domaine"}
                </span>
                <button type="button" onClick={resetDomainForm}>
                  <X className="h-4 w-4" style={{ color: "#666666" }} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "#666666" }}>
                    Nom de domaine
                  </label>
                  <input
                    type="text"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    placeholder="example.com"
                    disabled={!!editingDomain}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    style={{ ...inputStyle, background: "#FFFFFF" }}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "#666666" }}>
                    Limite journalière
                  </label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ ...inputStyle, background: "#FFFFFF" }}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "#666666" }}>
                    Limite mensuelle
                  </label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="30000"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ ...inputStyle, background: "#FFFFFF" }}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetDomainForm}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "#FFFFFF", color: "#666666", border: "1px solid #EEEEEE" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingDomain}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  {savingDomain && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingDomain ? "Modifier" : "Créer"}
                </button>
              </div>
            </form>
          )}

          {/* Domains List */}
          {loadingDomains ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0064FA" }} />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8" style={{ color: "#666666" }}>
              Aucun domaine configuré
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid #EEEEEE" }}
                >
                  {/* Domain header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer"
                    style={{ background: expandedDomain === domain.id ? "#F5F5F7" : "#FFFFFF" }}
                    onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: "#111111" }}>
                            {domain.name}
                          </span>
                          {!domain.active && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "#FEE2E8", color: "#F04B69" }}
                            >
                              Inactif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs" style={{ color: "#666666" }}>
                            <Users className="h-3 w-3 inline mr-1" />
                            {domain.accounts?.length || 0} compte{(domain.accounts?.length || 0) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 max-w-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-12" style={{ color: "#666666" }}>
                            Jour
                          </span>
                          <div className="flex-1">
                            <ProgressBar
                              current={domain.dailySent}
                              max={domain.dailyLimit}
                              color="#0064FA"
                            />
                          </div>
                          <span className="text-xs font-medium w-20 text-right" style={{ color: "#111111" }}>
                            {domain.dailySent}/{domain.dailyLimit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-12" style={{ color: "#666666" }}>
                            Mois
                          </span>
                          <div className="flex-1">
                            <ProgressBar
                              current={domain.monthlySent}
                              max={domain.monthlyLimit}
                              color="#28B95F"
                            />
                          </div>
                          <span className="text-xs font-medium w-20 text-right" style={{ color: "#111111" }}>
                            {domain.monthlySent}/{domain.monthlyLimit}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditDomain(domain)
                        }}
                        className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                      >
                        <Edit2 className="h-4 w-4" style={{ color: "#666666" }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDomain(domain.id)
                        }}
                        disabled={deletingDomainId === domain.id}
                        className="p-2 rounded-lg transition-colors hover:bg-red-50"
                      >
                        {deletingDomainId === domain.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#F04B69" }} />
                        ) : (
                          <Trash2 className="h-4 w-4" style={{ color: "#F04B69" }} />
                        )}
                      </button>
                      {expandedDomain === domain.id ? (
                        <ChevronUp className="h-4 w-4" style={{ color: "#666666" }} />
                      ) : (
                        <ChevronDown className="h-4 w-4" style={{ color: "#666666" }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded: Accounts */}
                  {expandedDomain === domain.id && (
                    <div
                      className="p-4 space-y-3"
                      style={{ background: "#FAFAFA", borderTop: "1px solid #EEEEEE" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#111111" }}>
                          Comptes SMTP
                        </span>
                        <button
                          onClick={() => {
                            resetAccountForm()
                            setShowAccountForm(domain.id)
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                          style={{ background: "#0064FA", color: "#FFFFFF" }}
                        >
                          <Plus className="h-3 w-3" />
                          Ajouter
                        </button>
                      </div>

                      {/* Account Form */}
                      {showAccountForm === domain.id && (
                        <form
                          onSubmit={(e) => handleSubmitAccount(e, domain.id)}
                          className="rounded-lg p-3 space-y-3"
                          style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: "#111111" }}>
                              {editingAccount ? "Modifier le compte" : "Nouveau compte"}
                            </span>
                            <button type="button" onClick={resetAccountForm}>
                              <X className="h-4 w-4" style={{ color: "#666666" }} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: "#666666" }}>
                                Email
                              </label>
                              <input
                                type="email"
                                value={accountEmail}
                                onChange={(e) => setAccountEmail(e.target.value)}
                                placeholder={`sender@${domain.name}`}
                                disabled={!!editingAccount}
                                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                style={inputStyle}
                                required={!editingAccount}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: "#666666" }}>
                                Mot de passe {editingAccount && "(laisser vide pour conserver)"}
                              </label>
                              <input
                                type="password"
                                value={accountPassword}
                                onChange={(e) => setAccountPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                                required={!editingAccount}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={resetAccountForm}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ background: "#FFFFFF", color: "#666666", border: "1px solid #EEEEEE" }}
                            >
                              Annuler
                            </button>
                            <button
                              type="submit"
                              disabled={savingAccount}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              style={{ background: "#0064FA", color: "#FFFFFF" }}
                            >
                              {savingAccount && <Loader2 className="h-3 w-3 animate-spin" />}
                              {editingAccount ? "Modifier" : "Créer"}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Accounts list */}
                      {domain.accounts?.length === 0 ? (
                        <div className="text-center py-4 text-sm" style={{ color: "#666666" }}>
                          Aucun compte configuré
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {domain.accounts?.map((account) => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" style={{ color: "#666666" }} />
                                <span className="text-sm" style={{ color: "#111111" }}>
                                  {account.email}
                                </span>
                                {!account.active && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: "#FEE2E8", color: "#F04B69" }}
                                  >
                                    Inactif
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditAccount(domain.id, account)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                                >
                                  <Edit2 className="h-3.5 w-3.5" style={{ color: "#666666" }} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(domain.id, account.id)}
                                  disabled={deletingAccountId === account.id}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                                >
                                  {deletingAccountId === account.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#F04B69" }} />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" style={{ color: "#F04B69" }} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Statistics */}
      {apiKey && (
        <div
          className="rounded-2xl p-6 w-full space-y-4"
          style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#E3F2FD" }}
              >
                <BarChart2 className="h-5 w-5" style={{ color: "#0064FA" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "#111111" }}>
                  Statistiques d&apos;envoi
                </h3>
                <p className="text-sm" style={{ color: "#666666" }}>
                  Vue d&apos;ensemble des emails
                </p>
              </div>
            </div>
            <button
              onClick={fetchStats}
              disabled={loadingStats}
              className="p-2 rounded-lg transition-colors"
              style={{ background: "#F5F5F7" }}
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} style={{ color: "#666666" }} />
            </button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0064FA" }} />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Reçus" value={stats.totalReceived} color="#0064FA" icon={Mail} />
              <StatCard label="Envoyés" value={stats.totalSent} color="#28B95F" icon={Send} />
              <StatCard label="Bloqués" value={stats.totalBlocked} color="#F0783C" icon={AlertCircle} />
              <StatCard label="Échecs" value={stats.totalFailed} color="#F04B69" icon={X} />
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: "#666666" }}>
              Aucune statistique disponible
            </div>
          )}
        </div>
      )}
    </div>
  )
}
