import type { CapacitorConfig } from "@capacitor/cli";

// לפני בניית APK: הגדירו את כתובת האתר בענן
// לדוגמה: set CAPACITOR_SERVER_URL=https://your-app.netlify.app
const serverUrl =
  process.env.CAPACITOR_SERVER_URL || "https://dfusbb-home-inventory.netlify.app";

const config: CapacitorConfig = {
  appId: "com.homeinventory.app",
  appName: "ניהול מלאי הבית",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#2563eb",
      showSpinner: true,
      spinnerColor: "#ffffff",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#2563eb",
    },
  },
};

export default config;
