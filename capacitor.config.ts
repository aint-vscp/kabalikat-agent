import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kabalikat.agent',
  appName: 'Kabalikat Agent',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      "accounts.google.com",
      "oauth2.googleapis.com",
      "www.googleapis.com"
    ]
  },
  overrideUserAgent: "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#4F46E5",
      sound: undefined
    }
  },
  android: {
    backgroundColor: "#0f172a",
    allowMixedContent: true
  }
};

export default config;
