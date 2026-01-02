"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Lock, Zap, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

interface TenantData {
  name: string
  logo: string | null
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [userName, setUserName] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsVerifying(false)
        return
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await res.json()

        if (data.valid) {
          setTokenValid(true)
          setUserName(data.name || "")
        } else {
          setError(data.error || "Lien invalide ou expiré")
        }
      } catch {
        setError("Une erreur est survenue")
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue")
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 3000)
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

  // Loading state
  if (isVerifying) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: "#0064FA" }} />
        <p style={{ color: "#666666" }}>Vérification du lien...</p>
      </div>
    )
  }

  // Invalid token state
  if (!tokenValid && !success) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "#FEE2E8" }}
          >
            <AlertCircle className="h-8 w-8" style={{ color: "#F04B69" }} />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ color: "#111111" }}>
          Lien invalide
        </h2>
        <p className="text-sm mb-6" style={{ color: "#666666" }}>
          {error || "Ce lien de réinitialisation est invalide ou a expiré."}
        </p>
        <Link href="/forgot-password">
          <button
            className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90"
            style={{
              background: "#0064FA",
              boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)",
            }}
          >
            Demander un nouveau lien
          </button>
        </Link>
        <div className="mt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: "#666666" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
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
          Mot de passe modifié !
        </h2>
        <p className="text-sm mb-4" style={{ color: "#666666" }}>
          Votre mot de passe a été réinitialisé avec succès.
        </p>
        <p className="text-sm mb-6" style={{ color: "#0064FA" }}>
          Redirection vers la connexion...
        </p>
        <Link href="/login">
          <button
            className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90"
            style={{
              background: "#0064FA",
              boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)",
            }}
          >
            Se connecter maintenant
          </button>
        </Link>
      </div>
    )
  }

  // Form state
  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-1" style={{ color: "#111111" }}>
          Nouveau mot de passe
        </h2>
        <p className="text-sm" style={{ color: "#999999" }}>
          {userName ? `Bonjour ${userName}, ` : ""}choisissez un nouveau mot de passe
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
            htmlFor="password"
            className="text-sm font-medium"
            style={{ color: "#444444" }}
          >
            Nouveau mot de passe
          </label>
          <div className="relative">
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
              style={{ color: focusedField === "password" ? "#0064FA" : "#999999" }}
            >
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              className="w-full pl-12 pr-12 h-12 rounded-xl text-sm transition-all duration-200 outline-none"
              style={focusedField === "password" ? inputFocusStyle : inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
              style={{ color: "#999999" }}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: "#999999" }}>
            Minimum 8 caractères
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium"
            style={{ color: "#444444" }}
          >
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
              style={{ color: focusedField === "confirmPassword" ? "#0064FA" : "#999999" }}
            >
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              className="w-full pl-12 pr-12 h-12 rounded-xl text-sm transition-all duration-200 outline-none"
              style={focusedField === "confirmPassword" ? inputFocusStyle : inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
              style={{ color: "#999999" }}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
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
            "Réinitialiser le mot de passe"
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
  )
}

export default function ResetPasswordPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null)

  useEffect(() => {
    fetch("/api/tenant")
      .then((res) => res.json())
      .then((data) => setTenant(data))
      .catch(() => {})
  }, [])

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
            Nouveau mot de passe
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
          <Suspense
            fallback={
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: "#0064FA" }} />
                <p style={{ color: "#666666" }}>Chargement...</p>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs mt-6" style={{ color: "#AEAEAE" }}>
          {tenant?.name || "Aurora CRM"} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
