"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Navigateur";
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        await checkSubscription();
      }
    };

    checkSupport();
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      return !!subscription;
    } catch (err) {
      console.error("[Push] Check subscription error:", err);
      return false;
    }
  }, []);

  const subscribe = useCallback(async (deviceName?: string) => {
    if (!isSupported) {
      setError("Notifications non supportees par ce navigateur");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setError("Permission refusee");
        return false;
      }

      // Get VAPID public key from server
      const vapidRes = await fetch("/api/push/vapid-key");
      if (!vapidRes.ok) {
        throw new Error("Impossible de recuperer la cle VAPID");
      }
      const { publicKey } = await vapidRes.json();

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: deviceName || getDeviceName(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }

      setIsSubscribed(true);
      console.log("[Push] Successfully subscribed");
      return true;
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Notify server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      console.log("[Push] Successfully unsubscribed");
      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du test");
      }

      return data.success;
    } catch (err) {
      console.error("[Push] Test notification error:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkSubscription,
  };
}
