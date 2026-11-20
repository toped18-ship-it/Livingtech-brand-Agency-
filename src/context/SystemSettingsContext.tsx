import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';

interface SystemSettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: Record<string, string> = {
  app_name: 'LIVINGTECH BRAND AGENCY',
  app_tagline: 'Enterprise Multi-Tenant Social Media & Brand Management SaaS',
  app_logo_url: '/assets/aistudio/20261112_184805_8a13799e.jpg',
  app_footer_text: '© 2026 LIVINGTECH BRAND AGENCY. Building Brands, Creating Possibilities.',
  app_welcome_message: 'Real-time database snapshot of your connected channels, publishing pipeline, AI Studio credits, and upcoming campaign schedule.',
  app_font_color: '#ffffff',
  allow_new_registrations: 'true',
  require_email_verification: 'true',
  default_trial_ai_credits: '250',
  max_publishing_retries: '3',
  maintenance_mode: 'false',
};

const SystemSettingsContext = createContext<SystemSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
});

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiClient.getSettings();
      if (data && typeof data === 'object') {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch {
      // Fallback safely to default settings
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fontColor = (settings.app_font_color || '#ffffff').trim() || '#ffffff';
    document.documentElement.style.setProperty('--app-font-color', fontColor);
    if (settings.app_name?.trim()) {
      document.title = settings.app_name.trim();
    }
  }, [settings.app_font_color, settings.app_name]);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => useContext(SystemSettingsContext);
