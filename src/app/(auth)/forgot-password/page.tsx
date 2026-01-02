"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Mail, Zap, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"

interface TenantData {
  name: string
  logo: string | null
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [tenant, setTenant] = useState<TenantData | null>(null)

  useEffect(() => {
    fetch("/api/tenant")
      .then((res) => res.json())
      .then((data) => setTenant(data))
      .catch(() => {})
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  const inputFocusStyle = {
    background: "#FFFFFF",
    border: "1px solid #0064FA",
    color: "#111111",
    boxShadow: "0 0 0 3px rgba(0, 100, 250, 0.1)",
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "#F5F5F7" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {tenant?.logo ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 bg-[#F5F5F7] flex items-center justify-center">
              <Image
                src={`/uploads/${tenant.logo}`}
                alt={tenant.name || "Logo"}
                width={96}
                height={96}
                className="object-contain"
              />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "#DCB40A", boxShadow: "0 4px 12px rgba(220, 180, 10, 0.3)" }}
            >
              <Zap className="h-10 w-10" style={{ color: "#111111" }} />
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
            {tenant?.name || "Aurora CRM"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#999999" }}>
            Récupération de compte
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
          }}
        >
          {success ? (
            // Success State
            <div className="text-center py-4">
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "#D4EDDA" }}
                >
                  <CheckCircle className="h-8 w-8" style={{ color: "#28B95F" }} />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-3" style={{ color: "#111111" }}>
                Email envoyé !
              </h2>
              <p className="text-sm mb-4" style={{ color: "#666666" }}>
                Si cette adresse email est associée à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <p className="text-xs mb-6" style={{ color: "#999999" }}>
                Pensez à vérifier vos spams.
              </p>
              <Link href="/login">
                <button
                  className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90"
                  style={{
                    background: "#0064FA",
                    boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)",
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                  Retour à la connexion
                </button>
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold mb-1" style={{ color: "#111111" }}>
                  Mot de passe oublié ?
                </h2>
                <p className="text-sm" style={{ color: "#999999" }}>
                  Entrez votre email pour recevoir un lien de réinitialisation
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                {error && (
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ background: "#FEE2E8", border: "1px solid #F04B69" }}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "#F04B69" }}
                    >
                      <AlertCircle className="h-4 w-4" style={{ color: "#FFFFFF" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: "#F04B69" }}>
                      {error}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium"
                    style={{ color: "#444444" }}
                  >
                    Adresse email
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: focusedField === "email" ? "#0064FA" : "#999999" }}
                    >
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="vous@exemple.com"
                      required
                      autoComplete="email"
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-12 pr-4 h-12 rounded-xl text-sm transition-all duration-200 outline-none"
                      style={focusedField === "email" ? inputFocusStyle : inputStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "#0064FA",
                    boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)",
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Envoyer le lien"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                  style={{ color: "#666666" }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Copyright */}
        <p className="text-center text-xs mt-6" style={{ color: "#AEAEAE" }}>
          {tenant?.name || "Aurora CRM"} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
