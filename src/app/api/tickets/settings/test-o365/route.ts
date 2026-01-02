import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, clientSecret, tenantId, supportEmail } = body

    if (!clientId || !clientSecret || !tenantId) {
      return NextResponse.json(
        { success: false, message: "Client ID, Secret et Tenant ID requis" },
        { status: 400 }
      )
    }

    // Get OAuth token from Microsoft
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      return NextResponse.json({
        success: false,
        message: `Erreur d'authentification: ${error.error_description || error.error || "Identifiants invalides"}`,
      })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Test access to mailbox if supportEmail is provided
    if (supportEmail) {
      const mailResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${supportEmail}/messages?$top=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (mailResponse.ok) {
        return NextResponse.json({
          success: true,
          message: `Connexion Office 365 réussie ! Accès à la boîte mail ${supportEmail} confirmé.`,
        })
      } else {
        const error = await mailResponse.json()
        return NextResponse.json({
          success: false,
          message: `Authentification OK mais accès à la boîte mail refusé: ${error.error?.message || "Permissions insuffisantes"}`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Connexion Office 365 réussie ! Token d'accès obtenu.",
    })
  } catch (error) {
    console.error("Error testing O365:", error)
    return NextResponse.json(
      { success: false, message: "Erreur lors du test Office 365" },
      { status: 500 }
    )
  }
}
