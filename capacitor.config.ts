import type { CapacitorConfig } from '@capacitor/cli';

// In development, set CAPACITOR_SERVER_URL=http://192.168.x.x:3000 to point to local dev server
// In production / CI, leave it unset so the app uses its bundled assets
const DEV_SERVER_URL = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.mitrrai.study',
  appName: 'MitrrAi',
  ...(DEV_SERVER_URL
    ? { server: { url: DEV_SERVER_URL, cleartext: true } }
    : { server: { url: 'https://mitrrai.in', cleartext: false } }),
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true for dev
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
};

export default config;
