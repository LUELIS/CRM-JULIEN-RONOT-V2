import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "fr.julienronot.crm",
  appName: "Julien RONOT CRM",
  webDir: "out",
  server: {
    // Point to your production URL for the mobile app
    url: "https://crm.julienronot.fr",
    // For local development, comment above and use:
    // url: "http://192.168.1.x:3000",
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0064FA",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: "#0064FA",
      style: "LIGHT",
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: true,
  },
}

export default config
