import webpush from "web-push";
import { prisma } from "./prisma";

// Configure web-push with VAPID keys
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  notificationId?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Send a push notification to a specific user (all their devices)
 */
export async function sendPushNotification(
  userId: bigint,
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );

      // Update last used timestamp
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });

      success++;
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      console.error(`[Push] Failed for subscription ${sub.id}:`, error);

      // If subscription is invalid (410 Gone or 404), deactivate it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
        console.log(`[Push] Deactivated invalid subscription ${sub.id}`);
      }

      failed++;
    }
  }

  return { success, failed };
}

/**
 * Send a push notification to all users in a tenant
 */
export async function sendPushToTenant(
  tenantId: bigint,
  payload: PushPayload,
  excludeUserId?: bigint
): Promise<{ success: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      tenant_id: tenantId,
      isActive: true,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
  });

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      success++;
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Send push to multiple specific users
 */
export async function sendPushToUsers(
  userIds: bigint[],
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, payload);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { success: totalSuccess, failed: totalFailed };
}

/**
 * Check if VAPID keys are configured
 */
export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_SUBJECT
  );
}
