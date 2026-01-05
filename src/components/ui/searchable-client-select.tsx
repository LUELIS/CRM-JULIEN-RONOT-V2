"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Search, X, Building2 } from "lucide-react"

interface Client {
  id: string
  companyName: string
  email?: string
  address?: string
  city?: string
  postalCode?: string
}

interface SearchableClientSelectProps {
  clients: Client[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function SearchableClientSelect({
  clients,
  value,
  onChange,
  placeholder = "Rechercher un client...",
  disabled = false,
}: SearchableClientSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedClient = clients.find((c) => c.id === value)

  const filteredClients = clients.filter((client) => {
    const searchLower = search.toLowerCase()
    return (
      client.companyName.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.city?.toLowerCase().includes(searchLower)
    )
  })

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (clientId: string) => {
    onChange(clientId)
    setIsOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setSearch("")
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-10 px-3 rounded-xl text-sm flex items-center justify-between cursor-pointer outline-none transition-all hover:border-[#CCCCCC] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "#F5F5F7",
          border: isOpen ? "1px solid #5F00BA" : "1px solid #EEEEEE",
          color: "#111111",
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: "#999999" }} />
          {selectedClient ? (
            <span className="truncate">{selectedClient.companyName}</span>
          ) : (
            <span style={{ color: "#999999" }}>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
            >
              <X className="h-3 w-3" style={{ color: "#999999" }} />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
            style={{ color: "#999999" }}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: "#FFFFFF",
            border: "1px solid #EEEEEE",
          }}
        >
          {/* Search Input */}
          <div className="p-2" style={{ borderBottom: "1px solid #EEEEEE" }}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "#999999" }}
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email, ville..."
                className="w-full h-9 pl-9 pr-3 rounded-lg text-sm outline-none"
                style={{
                  background: "#F5F5F7",
                  border: "1px solid #EEEEEE",
                  color: "#111111",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
                >
                  <X className="h-3 w-3" style={{ color: "#999999" }} />
                </button>
              )}
            </div>
          </div>

          {/* Client List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center" style={{ color: "#999999" }}>
                {search ? "Aucun client trouvé" : "Aucun client disponible"}
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client.id)}
                  className="w-full px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-[#F5F5F7] text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate" style={{ color: "#111111" }}>
                      {client.companyName}
                    </div>
                    {(client.email || client.city) && (
                      <div className="text-xs truncate" style={{ color: "#999999" }}>
                        {client.email}
                        {client.email && client.city && " • "}
                        {client.city}
                      </div>
                    )}
                  </div>
                  {value === client.id && (
                    <Check className="h-4 w-4 flex-shrink-0 ml-2" style={{ color: "#5F00BA" }} />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer with count */}
          <div
            className="px-3 py-2 text-xs"
            style={{
              borderTop: "1px solid #EEEEEE",
              background: "#FAFAFA",
              color: "#999999",
            }}
          >
            {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} trouvé
            {filteredClients.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  )
}
