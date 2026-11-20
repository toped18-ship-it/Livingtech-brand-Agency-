/**
 * Capacitor Mobile Configuration — LIVINGTECH BRAND AGENCY
 * Prepares the web build (dist/) for native Android (and iOS) packaging.
 * Run `npx cap add android && npx cap sync android` in Phase 2 mobile release pipeline.
 */
export interface CapacitorAppConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime: boolean;
  server: {
    androidScheme: 'https' | 'http';
    cleartext: boolean;
  };
  android: {
    allowMixedContent: boolean;
    backgroundColor: string;
    captureInput: boolean;
    webContentsDebuggingEnabled: boolean;
  };
  plugins: {
    SplashScreen: {
      launchShowDuration: number;
      backgroundColor: string;
      androidScaleType: string;
    };
    StatusBar: {
      style: 'DARK' | 'LIGHT';
      backgroundColor: string;
    };
  };
}

const config: CapacitorAppConfig = {
  appId: 'com.livingtech.brandagency',
  appName: 'LIVINGTECH BRAND AGENCY',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#071436',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#071436',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#071436',
    },
  },
};

export default config;
