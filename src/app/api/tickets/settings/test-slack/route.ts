import { NextRequest, NextResponse } from "next/server"
import { testSlackConnection } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl, botToken, channelId } = body

    if (!webhookUrl && !botToken) {
      return NextResponse.json(
        { success: false, message: "Webhook URL ou Bot Token requis" },
        { status: 400 }
      )
    }

    const result = await testSlackConnection(webhookUrl, botToken, channelId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error testing Slack:", error)
    return NextResponse.json(
      { success: false, message: "Erreur lors du test Slack" },
      { status: 500 }
    )
  }
}
