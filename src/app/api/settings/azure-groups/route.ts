import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Get Microsoft OAuth settings from database
async function getMicrosoftSettings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    return null
  }

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      clientId: settings.o365ClientId || settings.o365_client_id,
      clientSecret: settings.o365ClientSecret || settings.o365_client_secret,
      tenantId: settings.o365TenantId || settings.o365_tenant_id,
      enabled: settings.o365Enabled || settings.o365_enabled,
    }
  } catch {
    return null
  }
}

// GET: Fetch all groups from Azure AD
export async function GET() {
  try {
    const settings = await getMicrosoftSettings()

    if (!settings?.enabled || !settings.clientId || !settings.clientSecret || !settings.tenantId) {
      return NextResponse.json(
        { error: "Microsoft O365 non configuré. Veuillez d'abord configurer les credentials." },
        { status: 400 }
      )
    }

    // Get access token using client credentials flow
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Failed to get access token:", errorData)
      return NextResponse.json(
        { error: "Impossible d'obtenir un token d'accès. Vérifiez vos credentials O365." },
        { status: 401 }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Fetch groups from Microsoft Graph
    const groupsResponse = await fetch(
      "https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,mailEnabled,securityEnabled&$top=100",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!groupsResponse.ok) {
      const errorData = await groupsResponse.text()
      console.error("Failed to fetch groups:", errorData)
      return NextResponse.json(
        { error: "Impossible de récupérer les groupes. Vérifiez les permissions de l'application Azure AD (Group.Read.All)." },
        { status: 403 }
      )
    }

    const groupsData = await groupsResponse.json()

    // Format groups for the UI
    const groups = groupsData.value.map((group: any) => ({
      id: group.id,
      name: group.displayName,
      description: group.description || "",
      type: group.securityEnabled ? "security" : group.mailEnabled ? "mail" : "other",
    }))

    // Sort by name
    groups.sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({ groups })
  } catch (error) {
    console.error("Error fetching Azure AD groups:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des groupes Azure AD" },
      { status: 500 }
    )
  }
}
