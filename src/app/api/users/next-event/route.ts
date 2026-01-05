import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

interface CalendarEvent {
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName?: string }
  isAllDay: boolean
}

// Get O365 tenant settings
async function getO365TenantSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      enabled: settings.o365Enabled,
      clientId: settings.o365ClientId,
      clientSecret: settings.o365ClientSecret,
      tenantId: settings.o365TenantId,
    }
  } catch {
    return null
  }
}

// Refresh user's O365 token
async function refreshUserToken(
  userId: bigint,
  refreshToken: string,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<string | null> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantSettings.tenantId}/oauth2/v2.0/token`
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: tenantSettings.clientId,
        client_secret: tenantSettings.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Calendars.Read offline_access",
      }),
    })

    if (!response.ok) return null

    const data = await response.json()

    await prisma.user.update({
      where: { id: userId },
      data: {
        o365AccessToken: data.access_token,
        o365RefreshToken: data.refresh_token || refreshToken,
        o365TokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return data.access_token
  } catch {
    return null
  }
}

// GET: Get next calendar event for current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const o365Settings = await getO365TenantSettings()
    if (!o365Settings?.enabled) {
      return NextResponse.json({ nextEvent: null })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        id: true,
        o365AccessToken: true,
        o365RefreshToken: true,
        o365TokenExpiresAt: true,
      },
    })

    if (!user?.o365RefreshToken) {
      return NextResponse.json({ nextEvent: null, needsConnection: true })
    }

    // Get valid access token
    let accessToken = user.o365AccessToken
    if (!accessToken || !user.o365TokenExpiresAt || user.o365TokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      accessToken = await refreshUserToken(user.id, user.o365RefreshToken, o365Settings)
      if (!accessToken) {
        return NextResponse.json({ nextEvent: null, tokenExpired: true })
      }
    }

    // Get events from now until end of day
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${endOfDay.toISOString()}&$orderby=start/dateTime&$top=1&$select=subject,start,end,location,isAllDay`

    const response = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Paris"',
      },
    })

    if (!response.ok) {
      console.error("[Next Event] Calendar API error:", response.status)
      return NextResponse.json({ nextEvent: null })
    }

    const data = await response.json()
    const events: CalendarEvent[] = data.value || []

    if (events.length === 0) {
      return NextResponse.json({ nextEvent: null })
    }

    const nextEvent = events[0]
    const startTime = new Date(nextEvent.start.dateTime)
    const endTime = new Date(nextEvent.end.dateTime)

    return NextResponse.json({
      nextEvent: {
        subject: nextEvent.subject,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: nextEvent.location?.displayName || null,
        isAllDay: nextEvent.isAllDay,
        startsIn: Math.round((startTime.getTime() - now.getTime()) / 60000), // minutes
      },
    })
  } catch (error) {
    console.error("[Next Event] Error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
