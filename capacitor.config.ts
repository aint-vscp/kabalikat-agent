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
  }
};

export default config;
