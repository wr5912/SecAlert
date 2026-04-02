/**
 * 数据接入向导状态管理 (Zustand)
 */

import { create } from 'zustand';
import type { DeviceType, LogFormat, ConnectionConfig, DataSourceTemplate, BatchDevice, BatchCreateResponse } from '../types/ingestion';

// AI 识别结果类型
export interface LogFormatRecognitionResult {
  detected_format: string;
  regex_pattern: string;
  field_mappings: Record<string, string>;
  detected_fields: string[];
  confidence: number;
  reasoning: string;
}

// 解析预览结果类型
export interface ParsePreviewResult {
  success: boolean;
  parsed_fields: Record<string, string>;
  raw: string;
}

// 解析测试结果类型 (DI-09)
export interface ParseTestResult {
  total_logs: number;
  success_count: number;
  failure_count: number;
  overall_accuracy: number;
  field_accuracies: Array<{
    field_name: string;
    correct: number;
    total: number;
    accuracy: number;
  }>;
  failed_samples: Array<{
    log: string;
    error?: string;
    parsed?: Record<string, unknown>;
    expected?: Record<string, unknown>;
  }>;
  is_qualified: boolean;
}

interface IngestionState {
  // 向导状态
  isWizardOpen: boolean;
  step: number;

  // 编辑模式
  isEditMode: boolean;
  editingTemplate: DataSourceTemplate | null;

  // Step 1: 设备类型
  deviceType: DeviceType | null;

  // Step 2: 连接参数
  connection: ConnectionConfig | null;

  // Step 3: 日志格式
  logFormat: LogFormat | null;
  customRegex: string | null;

  // Step 4: 模板名称
  templateName: string;

  // AI 识别结果 (DI-07)
  sampleLogs: string[];
  aiRecognitionResult: LogFormatRecognitionResult | null;

  // 字段映射
  fieldMappings: Record<string, string>;

  // 解析预览结果
  parsePreviewResult: ParsePreviewResult | null;

  // 解析测试结果 (DI-09)
  parseTestResult: ParseTestResult | null;
  isTestQualified: boolean;

  // 当前模板 ID (AI 识别后自动保存模板时设置)
  currentTemplateId: string | null;
  currentTemplateSaved: boolean;

  // 批量导入状态 (DI-08)
  batchDevices: BatchDevice[];
  batchImportResult: BatchCreateResponse | null;

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;
  openEditWizard: (template: DataSourceTemplate) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setDeviceType: (type: DeviceType) => void;
  setConnection: (conn: ConnectionConfig) => void;
  setLogFormat: (format: LogFormat) => void;
  setCustomRegex: (regex: string) => void;
  setTemplateName: (name: string) => void;
  setSampleLogs: (logs: string[]) => void;
  setAiRecognitionResult: (result: LogFormatRecognitionResult) => void;
  setFieldMappings: (mappings: Record<string, string>) => void;
  setParsePreviewResult: (result: ParsePreviewResult | null) => void;
  setParseTestResult: (result: ParseTestResult | null, isQualified: boolean) => void;
  setBatchDevices: (devices: BatchDevice[]) => void;
  setBatchImportResult: (result: BatchCreateResponse | null) => void;
  setCurrentTemplateId: (id: string | null) => void;
  setCurrentTemplateSaved: (saved: boolean) => void;
}

const initialState = {
  isWizardOpen: false,
  step: 1,
  isEditMode: false,
  editingTemplate: null,
  deviceType: null,
  connection: null,
  logFormat: null,
  customRegex: null,
  templateName: '',
  // AI 识别结果
  sampleLogs: [],
  aiRecognitionResult: null,
  // 字段映射
  fieldMappings: {},
  // 解析预览结果
  parsePreviewResult: null,
  // 解析测试结果
  parseTestResult: null,
  isTestQualified: false,
  // 当前模板 ID
  currentTemplateId: null,
  currentTemplateSaved: false,
  // 批量导入状态
  batchDevices: [],
  batchImportResult: null,
};

export const useIngestionStore = create<IngestionState>((set) => ({
  ...initialState,

  openWizard: () => set({ isWizardOpen: true, isEditMode: false, editingTemplate: null }),

  closeWizard: () => set({ isWizardOpen: false, isEditMode: false, editingTemplate: null, step: 1 }),

  resetWizard: () => set({ ...initialState }),

  openEditWizard: (template) => set({
    isWizardOpen: true,
    isEditMode: true,
    editingTemplate: template,
    step: 4, // 直接跳到完成步骤，显示编辑确认
    deviceType: template.device_type,
    connection: template.connection,
    logFormat: template.log_format,
    customRegex: template.custom_regex || null,
    templateName: template.name,
  }),

  setStep: (step) => set({ step }),

  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 6) })),

  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),

  setDeviceType: (deviceType) => set({ deviceType }),

  setConnection: (connection) => set({ connection }),

  setLogFormat: (logFormat) => set({ logFormat }),

  setCustomRegex: (customRegex) => set({ customRegex }),

  setTemplateName: (templateName) => set({ templateName }),

  setSampleLogs: (sampleLogs) => set({ sampleLogs }),

  setAiRecognitionResult: (aiRecognitionResult) => set({ aiRecognitionResult }),

  setFieldMappings: (fieldMappings) => set({ fieldMappings }),

  setParsePreviewResult: (parsePreviewResult) => set({ parsePreviewResult }),

  setParseTestResult: (result, isQualified) => set({
    parseTestResult: result,
    isTestQualified: isQualified
  }),

  setBatchDevices: (batchDevices) => set({ batchDevices }),

  setBatchImportResult: (batchImportResult) => set({ batchImportResult }),

  setCurrentTemplateId: (currentTemplateId) => set({ currentTemplateId }),

  setCurrentTemplateSaved: (currentTemplateSaved) => set({ currentTemplateSaved }),
}));
