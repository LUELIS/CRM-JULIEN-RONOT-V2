"use client"

import { useState, useEffect } from "react"
import { Calendar } from "lucide-react"

export function DateDisplay() {
  const [date, setDate] = useState<string>("")

  useEffect(() => {
    setDate(new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }))
  }, [])

  if (!date) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground">
      <Calendar className="h-4 w-4 text-violet-400" />
      <span>{date}</span>
    </div>
  )
}
