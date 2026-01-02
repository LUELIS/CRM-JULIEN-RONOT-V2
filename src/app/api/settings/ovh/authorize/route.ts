import { NextRequest, NextResponse } from "next/server"

const ENDPOINTS: Record<string, string> = {
  "ovh-eu": "https://eu.api.ovh.com/1.0",
  "ovh-ca": "https://ca.api.ovh.com/1.0",
  "ovh-us": "https://us.api.ovh.com/1.0",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appKey, appSecret, endpoint = "ovh-eu" } = body

    if (!appKey || !appSecret) {
      return NextResponse.json(
        { error: "Application Key et Secret requis" },
        { status: 400 }
      )
    }

    const baseUrl = ENDPOINTS[endpoint] || ENDPOINTS["ovh-eu"]

    // Request a new consumer key with required permissions
    const res = await fetch(`${baseUrl}/auth/credential`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ovh-Application": appKey,
      },
      body: JSON.stringify({
        accessRules: [
          // Domain management
          { method: "GET", path: "/domain" },
          { method: "GET", path: "/domain/*" },
          { method: "PUT", path: "/domain/*" },
          // DNS Zone management
          { method: "GET", path: "/domain/zone/*" },
          { method: "POST", path: "/domain/zone/*" },
          { method: "PUT", path: "/domain/zone/*" },
          { method: "DELETE", path: "/domain/zone/*" },
        ],
        redirection: `${request.headers.get("origin") || "http://localhost:3000"}/settings?tab=ovh&authorized=true`,
      }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      return NextResponse.json(
        { error: error.message || "Erreur OVH" },
        { status: 500 }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      validationUrl: data.validationUrl,
      consumerKey: data.consumerKey,
      state: data.state,
    })
  } catch (error) {
    console.error("Error requesting OVH authorization:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la demande d'autorisation",
      },
      { status: 500 }
    )
  }
}
