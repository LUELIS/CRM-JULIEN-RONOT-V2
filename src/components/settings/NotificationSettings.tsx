"use client";

import { useState } from "react";
import { Bell, BellOff, Smartphone, Send, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [testSent, setTestSent] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const handleSubscribe = async () => {
    await subscribe();
  };

  const handleUnsubscribe = async () => {
    await unsubscribe();
  };

  const handleTest = async () => {
    setTestLoading(true);
    const success = await sendTestNotification();
    setTestSent(success);
    setTestLoading(false);
    if (success) {
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <BellOff className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-700">
              Notifications non supportees
            </p>
            <p className="text-sm text-slate-500">
              Votre navigateur ne supporte pas les notifications push.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isSubscribed ? "bg-emerald-100" : "bg-slate-100"}`}>
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-emerald-600" />
            ) : (
              <BellOff className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">
              Notifications Push
            </p>
            <p className="text-sm text-slate-500">
              {isSubscribed
                ? "Vous recevez des notifications sur cet appareil"
                : "Activez les notifications pour etre informe en temps reel"}
            </p>
          </div>
        </div>
        <Button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          className={isSubscribed ? "" : "bg-[#0064FA] hover:bg-[#0050C8]"}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            "Desactiver"
          ) : (
            "Activer"
          )}
        </Button>
      </div>

      {/* Test button (only if subscribed) */}
      {isSubscribed && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white">
              <Send className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-slate-700">
                Tester les notifications
              </p>
              <p className="text-sm text-slate-500">
                Envoyez une notification test a cet appareil
              </p>
            </div>
          </div>
          <Button
            onClick={handleTest}
            variant="outline"
            size="sm"
            disabled={testLoading || testSent}
          >
            {testLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testSent ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              "Tester"
            )}
          </Button>
        </div>
      )}

      {/* Device info */}
      {isSubscribed && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="p-2 rounded-lg bg-blue-100">
            <Smartphone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-700">
              Appareil enregistre
            </p>
            <p className="text-sm text-blue-600">
              Les notifications seront envoyees sur ce navigateur
            </p>
          </div>
        </div>
      )}

      {/* Permission denied warning */}
      {permission === "denied" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="p-2 rounded-lg bg-red-100">
            <X className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="font-medium text-red-700">
              Notifications bloquees
            </p>
            <p className="text-sm text-red-600">
              Vous avez bloque les notifications. Modifiez les parametres de votre navigateur pour les reactiver.
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="font-medium text-amber-700">Erreur</p>
            <p className="text-sm text-amber-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
