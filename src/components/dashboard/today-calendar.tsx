"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, Video, Clock, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

interface CalendarEvent {
  id: string
  subject: string
  startTime: string
  endTime: string
  location: string | null
  isAllDay: boolean
  hasVideoCall: boolean
  videoUrl: string | null
}

function formatTime(dateTimeStr: string): string {
  // dateTimeStr is in Paris time without timezone suffix (e.g., "2026-01-05T09:00:00")
  const time = dateTimeStr.substring(11, 16) // Extract "HH:MM"
  return time
}

function getTimeStatus(startTimeStr: string): { label: string; color: string; bg: string } {
  const now = new Date()
  // Get current Paris time
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }))

  // Parse start time (it's already in Paris time)
  const [hours, minutes] = startTimeStr.substring(11, 16).split(":").map(Number)
  const eventTime = new Date(parisNow)
  eventTime.setHours(hours, minutes, 0, 0)

  const diffMs = eventTime.getTime() - parisNow.getTime()
  const diffMins = Math.round(diffMs / 60000)

  if (diffMins < 0) {
    return { label: "En cours", color: "#28B95F", bg: "#D4EDDA" }
  } else if (diffMins <= 15) {
    return { label: `Dans ${diffMins} min`, color: "#F0783C", bg: "#FEF3CD" }
  } else if (diffMins <= 60) {
    return { label: `Dans ${diffMins} min`, color: "#0064FA", bg: "#E3F2FD" }
  } else {
    const hours = Math.floor(diffMins / 60)
    return { label: `Dans ${hours}h${diffMins % 60 > 0 ? String(diffMins % 60).padStart(2, "0") : ""}`, color: "#999999", bg: "#F5F5F7" }
  }
}

export function TodayCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [needsConnection, setNeedsConnection] = useState(false)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/users/today-events")
        const data = await res.json()

        if (data.needsConnection || data.needsSetup) {
          setNeedsConnection(true)
        } else {
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error("Failed to fetch calendar events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div
        className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#E6F0FF' }}
          >
            <Calendar className="h-5 w-5" style={{ color: '#0064FA' }} />
          </div>
          <div>
            <h3 className="text-base font-medium" style={{ color: '#111111' }}>Agenda du jour</h3>
            <p className="text-xs" style={{ color: '#999999' }}>Chargement...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" style={{ color: '#0064FA' }} />
        </div>
      </div>
    )
  }

  if (needsConnection) {
    return (
      <div
        className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#E6F0FF' }}
          >
            <Calendar className="h-5 w-5" style={{ color: '#0064FA' }} />
          </div>
          <div>
            <h3 className="text-base font-medium" style={{ color: '#111111' }}>Agenda du jour</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: '#FEF3CD' }}
          >
            <AlertCircle className="h-6 w-6" style={{ color: '#F0783C' }} />
          </div>
          <p className="text-sm mb-3" style={{ color: '#666666' }}>Calendrier non connecté</p>
          <Link
            href="/settings?tab=profile"
            className="text-sm font-medium hover:underline"
            style={{ color: '#0064FA' }}
          >
            Connecter mon calendrier O365
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#E6F0FF' }}
          >
            <Calendar className="h-5 w-5" style={{ color: '#0064FA' }} />
          </div>
          <div>
            <h3 className="text-base font-medium" style={{ color: '#111111' }}>Agenda du jour</h3>
            <p className="text-xs" style={{ color: '#999999' }}>
              {events.length === 0 ? "Aucun RDV" : `${events.length} RDV`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="py-6 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: '#D4EDDA' }}
            >
              <Calendar className="h-6 w-6" style={{ color: '#28B95F' }} />
            </div>
            <p className="text-sm" style={{ color: '#666666' }}>Aucun rendez-vous aujourd&apos;hui</p>
            <p className="text-xs mt-1" style={{ color: '#999999' }}>Profitez de votre journée !</p>
          </div>
        ) : (
          events.map((event) => {
            const timeStatus = event.isAllDay ? null : getTimeStatus(event.startTime)

            return (
              <div
                key={event.id}
                className="p-3 rounded-xl transition-colors hover:bg-[#F5F5F7]"
                style={{ background: '#FAFAFA' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#111111' }}>
                      {event.subject}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {event.isAllDay ? (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ background: '#E6F0FF', color: '#0064FA' }}
                        >
                          Toute la journée
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#666666' }}>
                          <Clock className="h-3 w-3" />
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1 text-xs truncate" style={{ color: '#999999' }}>
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.hasVideoCall && event.videoUrl && (
                      <a
                        href={event.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ background: '#E3F2FD', color: '#0064FA' }}
                        title="Rejoindre la visio"
                      >
                        <Video className="h-4 w-4" />
                      </a>
                    )}
                    {timeStatus && (
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{ background: timeStatus.bg, color: timeStatus.color }}
                      >
                        {timeStatus.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
