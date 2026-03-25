/**
 * 用户偏好 Store
 * 使用 Zustand persist middleware 持久化到 localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Severity } from '../types';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultSeverity: Severity | 'all';
  defaultTab: 'active' | 'suppressed';
  autoRefresh: boolean;
  refreshInterval: number;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

export function usePreferencesStore() {
  return create<UserPreferences>()(
    persist(
      (set) => ({
        theme: 'system',
        defaultSeverity: 'all',
        defaultTab: 'active',
        autoRefresh: true,
        refreshInterval: 60,
        setPreference: (key, value) => set((state) => ({ [key]: value })),
      }),
      {
        name: 'secalert-preferences',
      }
    )
  );
}