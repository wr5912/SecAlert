/**
 * 数据接入向导状态管理 (Zustand)
 */

import { create } from 'zustand';
import type { DeviceType, LogFormat, ConnectionConfig } from '../types/ingestion';

interface IngestionState {
  // 向导状态
  isWizardOpen: boolean;
  step: number;

  // Step 1: 设备类型
  deviceType: DeviceType | null;

  // Step 2: 连接参数
  connection: ConnectionConfig | null;

  // Step 3: 日志格式
  logFormat: LogFormat | null;
  customRegex: string | null;

  // Step 4: 模板名称
  templateName: string;

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setDeviceType: (type: DeviceType) => void;
  setConnection: (conn: ConnectionConfig) => void;
  setLogFormat: (format: LogFormat) => void;
  setCustomRegex: (regex: string) => void;
  setTemplateName: (name: string) => void;
}

const initialState = {
  isWizardOpen: false,
  step: 1,
  deviceType: null,
  connection: null,
  logFormat: null,
  customRegex: null,
  templateName: '',
};

export const useIngestionStore = create<IngestionState>((set) => ({
  ...initialState,

  openWizard: () => set({ isWizardOpen: true }),

  closeWizard: () => set({ isWizardOpen: false }),

  resetWizard: () => set(initialState),

  setStep: (step) => set({ step }),

  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 4) })),

  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),

  setDeviceType: (deviceType) => set({ deviceType }),

  setConnection: (connection) => set({ connection }),

  setLogFormat: (logFormat) => set({ logFormat }),

  setCustomRegex: (customRegex) => set({ customRegex }),

  setTemplateName: (templateName) => set({ templateName }),
}));
