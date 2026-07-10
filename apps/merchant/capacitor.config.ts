import type { CapacitorConfig } from '@capacitor/cli';
import { CAPACITOR_ALLOW_NAVIGATION } from '../../packages/shared/src/constants/capacitorNavigation';

const config: CapacitorConfig = {
  appId: 'iq.mahalak.merchant',
  appName: 'محلك - تاجر',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [...CAPACITOR_ALLOW_NAVIGATION],
  },
  android: {
    path: 'android',
  },
  ios: {
    path: 'ios',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0B1320',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
