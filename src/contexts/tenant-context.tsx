"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface TenantData {
  id: string
  name: string
  slug: string
  domain: string | null
  email: string
  phone: string | null
  address: string | null
  logo: string | null
  timezone: string
  currency: string
  status: string
}

interface TenantContextType {
  tenant: TenantData | null
  loading: boolean
  error: string | null
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenant = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/tenant")
      if (!response.ok) {
        throw new Error("Failed to fetch tenant")
      }
      const data = await response.json()
      setTenant(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenant()
  }, [])

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        error,
        refreshTenant: fetchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider")
  }
  return context
}
