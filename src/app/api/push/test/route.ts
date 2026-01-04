import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushNotification, isPushConfigured } from "@/lib/push-notifications";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications non configurees (VAPID keys manquantes)" },
        { status: 500 }
      );
    }

    const result = await sendPushNotification(BigInt(session.user.id), {
      title: "Test CRM",
      body: "Les notifications push fonctionnent correctement !",
      url: "/dashboard",
      tag: "test-notification",
      icon: "/icons/icon-192x192.png",
    });

    if (result.success === 0 && result.failed === 0) {
      return NextResponse.json({
        success: false,
        message: "Aucun appareil enregistre pour les notifications",
        sent: result.success,
        failed: result.failed,
      });
    }

    return NextResponse.json({
      success: result.success > 0,
      message: result.success > 0
        ? "Notification envoyee avec succes"
        : "Echec de l'envoi",
      sent: result.success,
      failed: result.failed,
    });
  } catch (error) {
    console.error("[Push] Test error:", error);
    return NextResponse.json(
      { error: "Erreur lors du test" },
      { status: 500 }
    );
  }
}
