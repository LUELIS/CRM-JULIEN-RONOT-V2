"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Shield, LogOut, Loader2 } from "lucide-react"

export function ImpersonationBanner() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const [isEnding, setIsEnding] = useState(false)

  // Only show if impersonating
  if (!session?.user?.isImpersonating) {
    return null
  }

  const handleEndImpersonation = async () => {
    setIsEnding(true)
    try {
      const response = await fetch("/api/auth/impersonate", {
        method: "DELETE",
      })

      if (response.ok) {
        // Update session to end impersonation
        await updateSession({ endImpersonation: true })
        // Navigate back to admin
        router.push("/clients")
        router.refresh()
      }
    } catch (error) {
      console.error("Error ending impersonation:", error)
    } finally {
      setIsEnding(false)
    }
  }

  const clientName = (session.user as any).impersonatedClientName || "Client"

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4"
      style={{ background: "#FFF9E6", color: "#9A7B00" }}
    >
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4" />
        <span>
          Vous êtes connecté en tant que <strong>{clientName}</strong>
        </span>
      </div>
      <button
        onClick={handleEndImpersonation}
        disabled={isEnding}
        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ background: "#DCB40A", color: "#FFFFFF" }}
      >
        {isEnding ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <LogOut className="w-3 h-3" />
        )}
        Revenir à mon compte
      </button>
    </div>
  )
}
