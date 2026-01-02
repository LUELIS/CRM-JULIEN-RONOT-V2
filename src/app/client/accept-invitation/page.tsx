"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, Zap, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

interface InvitationData {
  name: string
  email: string
  companyName: string
}

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("Lien d'invitation invalide")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/accept-invitation?token=${token}`)
        const data = await response.json()

        if (data.valid) {
          setIsValid(true)
          setInvitation(data.user)
        } else {
          setError(data.error || "Invitation invalide ou expirée")
        }
      } catch {
        setError("Erreur lors de la vérification de l'invitation")
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [token])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/client/login")
        }, 2000)
      } else {
        setError(data.error || "Erreur lors de l'activation du compte")
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    borderRadius: "12px",
    padding: "14px 16px 14px 48px",
    width: "100%",
    fontSize: "15px",
    color: "#111111",
    outline: "none",
    transition: "all 0.2s ease",
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F7" }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#0064FA" }} />
          <p style={{ color: "#666666" }}>Vérification de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (!isValid && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F5F5F7" }}>
        <div
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: "#FEE2E8" }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: "#F04B69" }} />
          </div>
          <h1 className="text-xl font-bold mb-3" style={{ color: "#111111" }}>
            Invitation invalide
          </h1>
          <p className="text-sm mb-6" style={{ color: "#666666" }}>
            {error || "Ce lien d'invitation n'est plus valide ou a expiré."}
          </p>
          <Link
            href="/client/login"
            className="inline-block px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F5F5F7" }}>
        <div
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: "#E8F8EE" }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: "#28B95F" }} />
          </div>
          <h1 className="text-xl font-bold mb-3" style={{ color: "#111111" }}>
            Compte activé !
          </h1>
          <p className="text-sm mb-6" style={{ color: "#666666" }}>
            Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion...
          </p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#0064FA" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F5F5F7" }}>
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "#DCB40A" }}
          >
            <Zap className="w-7 h-7" style={{ color: "#111111" }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#111111" }}>
            Bienvenue {invitation?.name} !
          </h1>
          <p className="text-sm" style={{ color: "#666666" }}>
            Créez votre mot de passe pour accéder à l'espace client de{" "}
            <strong style={{ color: "#0064FA" }}>{invitation?.companyName}</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
              Email
            </label>
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              {invitation?.email}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: "#AEAEAE" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "#AEAEAE" }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: "#AEAEAE" }}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "#AEAEAE" }}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#FEE2E8", color: "#F04B69" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#0064FA" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activation...
              </>
            ) : (
              "Activer mon compte"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#AEAEAE" }}>
          Vous avez déjà un compte ?{" "}
          <Link href="/client/login" className="font-medium" style={{ color: "#0064FA" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F7" }}>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#0064FA" }} />
        <p style={{ color: "#666666" }}>Chargement...</p>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
