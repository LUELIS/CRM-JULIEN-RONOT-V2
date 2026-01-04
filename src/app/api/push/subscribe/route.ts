import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// Generate SHA256 hash of endpoint for unique constraint
function hashEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { subscription, deviceName } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "Subscription invalide" },
        { status: 400 }
      );
    }

    const userId = BigInt(session.user.id);

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenant_id: true },
    });

    if (!user?.tenant_id) {
      return NextResponse.json(
        { error: "Tenant non trouve" },
        { status: 400 }
      );
    }

    const endpointHash = hashEndpoint(subscription.endpoint);

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpointHash: {
          userId,
          endpointHash,
        },
      },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
        lastUsedAt: new Date(),
        userAgent: request.headers.get("user-agent") || undefined,
        deviceName: deviceName || undefined,
      },
      create: {
        tenant_id: user.tenant_id,
        userId,
        endpoint: subscription.endpoint,
        endpointHash,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent") || undefined,
        deviceName: deviceName || undefined,
      },
    });

    console.log(`[Push] Subscription saved for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push] Subscription error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { endpoint } = await request.json();
    const userId = BigInt(session.user.id);

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint requis" },
        { status: 400 }
      );
    }

    const endpointHash = hashEndpoint(endpoint);

    // Deactivate the subscription
    await prisma.pushSubscription.updateMany({
      where: {
        userId,
        endpointHash,
      },
      data: {
        isActive: false,
      },
    });

    console.log(`[Push] Subscription deactivated for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push] Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la desinscription" },
      { status: 500 }
    );
  }
}

// GET - List user's subscriptions
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const userId = BigInt(session.user.id);

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: {
        lastUsedAt: "desc",
      },
    });

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        ...s,
        id: s.id.toString(),
      })),
    });
  } catch (error) {
    console.error("[Push] List subscriptions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation" },
      { status: 500 }
    );
  }
}
