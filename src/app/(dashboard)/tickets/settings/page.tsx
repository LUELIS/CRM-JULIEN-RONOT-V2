"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Mail,
  Eye,
  EyeOff,
  Plug,
  ChevronDown,
} from "lucide-react"

export default function TicketSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState("slack")

  // Slack
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const [slackBotToken, setSlackBotToken] = useState("")
  const [slackChannelId, setSlackChannelId] = useState("")
  const [slackNotifyOnNew, setSlackNotifyOnNew] = useState(true)
  const [slackNotifyOnReply, setSlackNotifyOnReply] = useState(true)

  // OpenAI
  const [openaiEnabled, setOpenaiEnabled] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini")
  const [openaiAutoSuggest, setOpenaiAutoSuggest] = useState(true)
  const [openaiAutoClassify, setOpenaiAutoClassify] = useState(false)

  // O365
  const [o365Enabled, setO365Enabled] = useState(false)
  const [o365ClientId, setO365ClientId] = useState("")
  const [o365ClientSecret, setO365ClientSecret] = useState("")
  const [o365TenantId, setO365TenantId] = useState("")
  const [o365SupportEmail, setO365SupportEmail] = useState("")
  const [o365AutoSync, setO365AutoSync] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/tickets/settings")
      if (res.ok) {
        const data = await res.json()
        // Slack
        setSlackEnabled(data.slackEnabled || false)
        setSlackWebhookUrl(data.slackWebhookUrl || "")
        setSlackBotToken(data.slackBotToken || "")
        setSlackChannelId(data.slackChannelId || "")
        setSlackNotifyOnNew(data.slackNotifyOnNew ?? true)
        setSlackNotifyOnReply(data.slackNotifyOnReply ?? true)
        // OpenAI
        setOpenaiEnabled(data.openaiEnabled || false)
        setOpenaiApiKey(data.openaiApiKey || "")
        setOpenaiModel(data.openaiModel || "gpt-4o-mini")
        setOpenaiAutoSuggest(data.openaiAutoSuggest ?? true)
        setOpenaiAutoClassify(data.openaiAutoClassify ?? false)
        // O365
        setO365Enabled(data.o365Enabled || false)
        setO365ClientId(data.o365ClientId || "")
        setO365ClientSecret(data.o365ClientSecret || "")
        setO365TenantId(data.o365TenantId || "")
        setO365SupportEmail(data.o365SupportEmail || "")
        setO365AutoSync(data.o365AutoSync ?? false)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (section: string, data: Record<string, unknown>) => {
    setSaving(section)
    setSaved(null)
    setTestResult(null)

    try {
      const res = await fetch("/api/tickets/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...data }),
      })

      if (res.ok) {
        setSaved(section)
        setTimeout(() => setSaved(null), 3000)
      } else {
        const error = await res.json()
        setTestResult({ type: "error", message: error.error || "Erreur lors de l'enregistrement" })
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setTestResult({ type: "error", message: "Erreur lors de l'enregistrement" })
    } finally {
      setSaving(null)
    }
  }

  const testSlack = async () => {
    setSaving("slack-test")
    setTestResult(null)

    try {
      const res = await fetch("/api/tickets/settings/test-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: slackWebhookUrl,
          botToken: slackBotToken,
          channelId: slackChannelId,
        }),
      })

      const data = await res.json()
      setTestResult({
        type: data.success ? "success" : "error",
        message: data.message,
      })
    } catch {
      setTestResult({ type: "error", message: "Erreur lors du test Slack" })
    } finally {
      setSaving(null)
    }
  }

  const testOpenAI = async () => {
    setSaving("openai-test")
    setTestResult(null)

    try {
      const res = await fetch("/api/tickets/settings/test-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: openaiApiKey,
          model: openaiModel,
        }),
      })

      const data = await res.json()
      setTestResult({
        type: data.success ? "success" : "error",
        message: data.message,
      })
    } catch {
      setTestResult({ type: "error", message: "Erreur lors du test OpenAI" })
    } finally {
      setSaving(null)
    }
  }

  const testO365 = async () => {
    setSaving("o365-test")
    setTestResult(null)

    try {
      const res = await fetch("/api/tickets/settings/test-o365", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: o365ClientId,
          clientSecret: o365ClientSecret,
          tenantId: o365TenantId,
          supportEmail: o365SupportEmail,
        }),
      })

      const data = await res.json()
      setTestResult({
        type: data.success ? "success" : "error",
        message: data.message,
      })
    } catch {
      setTestResult({ type: "error", message: "Erreur lors du test O365" })
    } finally {
      setSaving(null)
    }
  }

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="h-10 w-10 border-4 rounded-full animate-spin"
          style={{ borderColor: "#EEEEEE", borderTopColor: "#0064FA" }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header - Style sobre */}
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: "#F5F5F7", color: "#666666" }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Configuration Support
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Configurez les intégrations pour le support client
          </p>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            background: testResult.type === "success" ? "#D4EDDA" : "#FEE2E8",
            border: `1px solid ${testResult.type === "success" ? "#28B95F" : "#F04B69"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: testResult.type === "success" ? "#28B95F" : "#F04B69" }}
            >
              {testResult.type === "success" ? (
                <CheckCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} />
              ) : (
                <AlertCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} />
              )}
            </div>
            <span style={{ color: testResult.type === "success" ? "#28B95F" : "#F04B69" }}>
              {testResult.message}
            </span>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="hover:opacity-70"
            style={{ color: testResult.type === "success" ? "#28B95F" : "#F04B69" }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: "#F5F5F7" }}
      >
        <button
          onClick={() => setActiveTab("slack")}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
          style={{
            background: activeTab === "slack" ? "#FFFFFF" : "transparent",
            color: activeTab === "slack" ? "#5F00BA" : "#666666",
            boxShadow: activeTab === "slack" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Slack</span>
        </button>
        <button
          onClick={() => setActiveTab("openai")}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
          style={{
            background: activeTab === "openai" ? "#FFFFFF" : "transparent",
            color: activeTab === "openai" ? "#28B95F" : "#666666",
            boxShadow: activeTab === "openai" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">OpenAI</span>
        </button>
        <button
          onClick={() => setActiveTab("o365")}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
          style={{
            background: activeTab === "o365" ? "#FFFFFF" : "transparent",
            color: activeTab === "o365" ? "#0064FA" : "#666666",
            boxShadow: activeTab === "o365" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Office 365</span>
        </button>
      </div>

      {/* Slack Settings */}
      {activeTab === "slack" && (
        <div
          className="rounded-2xl p-6 space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#F3E8FF" }}
              >
                <MessageSquare className="h-5 w-5" style={{ color: "#5F00BA" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Intégration Slack
                </h2>
                <p className="text-sm" style={{ color: "#666666" }}>
                  Recevez les notifications de tickets dans Slack
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={slackEnabled}
                onChange={(e) => setSlackEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  background: slackEnabled ? "#5F00BA" : "#CCCCCC",
                }}
              />
            </label>
          </div>

          {slackEnabled && (
            <>
              {/* Info box */}
              <div
                className="rounded-xl p-4"
                style={{ background: "#F3E8FF", border: "1px solid #5F00BA" }}
              >
                <h4 className="font-medium mb-2" style={{ color: "#5F00BA" }}>
                  Configuration Slack
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#5F00BA" }}>
                  <li>
                    Créez une App Slack sur{" "}
                    <a
                      href="https://api.slack.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      api.slack.com
                    </a>
                  </li>
                  <li>Activez les Incoming Webhooks et copiez l&apos;URL</li>
                  <li>Pour les notifications avancées, ajoutez un Bot Token</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Webhook URL *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#5F00BA]/20"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                      style={{ color: "#999999" }}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Bot Token (optionnel)
                  </label>
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={slackBotToken}
                    onChange={(e) => setSlackBotToken(e.target.value)}
                    placeholder="xoxb-..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#5F00BA]/20"
                    style={inputStyle}
                  />
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Pour des fonctionnalités avancées (réponses depuis Slack)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Channel ID
                  </label>
                  <input
                    value={slackChannelId}
                    onChange={(e) => setSlackChannelId(e.target.value)}
                    placeholder="C0123456789"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5F00BA]/20"
                    style={inputStyle}
                  />
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: "#F5F5F7" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "#111111" }}>
                      Notifier à la création
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Recevoir une alerte pour chaque nouveau ticket
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackNotifyOnNew}
                      onChange={(e) => setSlackNotifyOnNew(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        background: slackNotifyOnNew ? "#5F00BA" : "#CCCCCC",
                      }}
                    />
                  </label>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: "#F5F5F7" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "#111111" }}>
                      Notifier à chaque réponse
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Recevoir une alerte quand un client répond
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackNotifyOnReply}
                      onChange={(e) => setSlackNotifyOnReply(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        background: slackNotifyOnReply ? "#5F00BA" : "#CCCCCC",
                      }}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          <div
            className="flex flex-wrap items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #EEEEEE" }}
          >
            {slackEnabled && (
              <button
                onClick={testSlack}
                disabled={saving === "slack-test" || !slackWebhookUrl}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                {saving === "slack-test" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Tester
              </button>
            )}

            <button
              onClick={() =>
                handleSave("slack", {
                  slackEnabled,
                  slackWebhookUrl,
                  slackBotToken,
                  slackChannelId,
                  slackNotifyOnNew,
                  slackNotifyOnReply,
                })
              }
              disabled={saving === "slack"}
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#5F00BA", color: "#FFFFFF" }}
            >
              {saving === "slack" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </button>

            {saved === "slack" && (
              <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}>
                <CheckCircle className="h-4 w-4" />
                Enregistré
              </span>
            )}
          </div>
        </div>
      )}

      {/* OpenAI Settings */}
      {activeTab === "openai" && (
        <div
          className="rounded-2xl p-6 space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#D4EDDA" }}
              >
                <Sparkles className="h-5 w-5" style={{ color: "#28B95F" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Intelligence Artificielle (OpenAI)
                </h2>
                <p className="text-sm" style={{ color: "#666666" }}>
                  Utilisez l&apos;IA pour améliorer le support
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={openaiEnabled}
                onChange={(e) => setOpenaiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  background: openaiEnabled ? "#28B95F" : "#CCCCCC",
                }}
              />
            </label>
          </div>

          {openaiEnabled && (
            <>
              {/* Info box */}
              <div
                className="rounded-xl p-4"
                style={{ background: "#D4EDDA", border: "1px solid #28B95F" }}
              >
                <h4 className="font-medium mb-2" style={{ color: "#28B95F" }}>
                  Fonctionnalités IA
                </h4>
                <ul className="text-sm space-y-1" style={{ color: "#28B95F" }}>
                  <li>
                    • <strong>Suggestions de réponse :</strong> L&apos;IA propose des réponses basées
                    sur l&apos;historique
                  </li>
                  <li>
                    • <strong>Classification automatique :</strong> Priorité et catégorie détectées
                    automatiquement
                  </li>
                  <li>
                    • <strong>Résumé :</strong> Génération de résumés des conversations
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    API Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#28B95F]/20"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                      style={{ color: "#999999" }}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Obtenez votre clé sur{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Modèle
                  </label>
                  <div className="relative">
                    <select
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none appearance-none focus:ring-2 focus:ring-[#28B95F]/20"
                      style={inputStyle}
                    >
                      <option value="gpt-4o-mini">GPT-4o Mini (rapide, économique)</option>
                      <option value="gpt-4o">GPT-4o (meilleur, plus lent)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (legacy)</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: "#999999" }}
                    />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: "#F5F5F7" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "#111111" }}>
                      Suggestions de réponse
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      L&apos;IA suggère des réponses aux tickets
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openaiAutoSuggest}
                      onChange={(e) => setOpenaiAutoSuggest(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        background: openaiAutoSuggest ? "#28B95F" : "#CCCCCC",
                      }}
                    />
                  </label>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: "#F5F5F7" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "#111111" }}>
                      Classification automatique
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Détecter automatiquement la priorité et le type
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openaiAutoClassify}
                      onChange={(e) => setOpenaiAutoClassify(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        background: openaiAutoClassify ? "#28B95F" : "#CCCCCC",
                      }}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          <div
            className="flex flex-wrap items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #EEEEEE" }}
          >
            {openaiEnabled && (
              <button
                onClick={testOpenAI}
                disabled={saving === "openai-test" || !openaiApiKey}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                {saving === "openai-test" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Tester
              </button>
            )}

            <button
              onClick={() =>
                handleSave("openai", {
                  openaiEnabled,
                  openaiApiKey,
                  openaiModel,
                  openaiAutoSuggest,
                  openaiAutoClassify,
                })
              }
              disabled={saving === "openai"}
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#28B95F", color: "#FFFFFF" }}
            >
              {saving === "openai" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </button>

            {saved === "openai" && (
              <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}>
                <CheckCircle className="h-4 w-4" />
                Enregistré
              </span>
            )}
          </div>
        </div>
      )}

      {/* O365 Settings */}
      {activeTab === "o365" && (
        <div
          className="rounded-2xl p-6 space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#E3F2FD" }}
              >
                <Mail className="h-5 w-5" style={{ color: "#0064FA" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Microsoft Office 365
                </h2>
                <p className="text-sm" style={{ color: "#666666" }}>
                  Synchronisez les emails de support avec Office 365
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={o365Enabled}
                onChange={(e) => setO365Enabled(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  background: o365Enabled ? "#0064FA" : "#CCCCCC",
                }}
              />
            </label>
          </div>

          {o365Enabled && (
            <>
              {/* Info box */}
              <div
                className="rounded-xl p-4"
                style={{ background: "#E3F2FD", border: "1px solid #0064FA" }}
              >
                <h4 className="font-medium mb-2" style={{ color: "#0064FA" }}>
                  Configuration Azure AD
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#0064FA" }}>
                  <li>
                    Créez une application dans{" "}
                    <a
                      href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Azure AD
                    </a>
                  </li>
                  <li>Ajoutez les permissions Microsoft Graph : Mail.Read, Mail.Send</li>
                  <li>Créez un secret client et copiez les identifiants</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Client ID (Application ID) *
                  </label>
                  <input
                    value={o365ClientId}
                    onChange={(e) => setO365ClientId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Tenant ID *
                  </label>
                  <input
                    value={o365TenantId}
                    onChange={(e) => setO365TenantId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Client Secret *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={o365ClientSecret}
                      onChange={(e) => setO365ClientSecret(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                      style={{ color: "#999999" }}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Adresse email de support *
                  </label>
                  <input
                    type="email"
                    value={o365SupportEmail}
                    onChange={(e) => setO365SupportEmail(e.target.value)}
                    placeholder="support@votreentreprise.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={inputStyle}
                  />
                  <p className="text-xs" style={{ color: "#999999" }}>
                    La boîte mail à synchroniser pour les tickets
                  </p>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: "#F5F5F7" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "#111111" }}>
                      Synchronisation automatique
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Créer des tickets depuis les emails entrants
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={o365AutoSync}
                      onChange={(e) => setO365AutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        background: o365AutoSync ? "#0064FA" : "#CCCCCC",
                      }}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          <div
            className="flex flex-wrap items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #EEEEEE" }}
          >
            {o365Enabled && (
              <button
                onClick={testO365}
                disabled={saving === "o365-test" || !o365ClientId || !o365ClientSecret}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                {saving === "o365-test" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Tester la connexion
              </button>
            )}

            <button
              onClick={() =>
                handleSave("o365", {
                  o365Enabled,
                  o365ClientId,
                  o365ClientSecret,
                  o365TenantId,
                  o365SupportEmail,
                  o365AutoSync,
                })
              }
              disabled={saving === "o365"}
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {saving === "o365" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </button>

            {saved === "o365" && (
              <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}>
                <CheckCircle className="h-4 w-4" />
                Enregistré
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
