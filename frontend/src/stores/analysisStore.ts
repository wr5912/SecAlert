/**
 * 分析模块全局状态管理
 * 使用 Zustand 管理分析工作台的全局状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StorylineFilters, TimeRange, Severity } from '../types/analysis';

// 分析视图类型
export type AnalysisView = 'alerts' | 'graph' | 'timeline' | 'hunting' | 'assets';

// 分析状态接口
export interface AnalysisState {
  // 当前视图
  currentView: AnalysisView;
  // 选中的故事线ID
  selectedStorylineId: string | null;
  // 选中的实体ID
  selectedEntityId: string | null;
  // 选中的实体类型
  selectedEntityType: 'host' | 'user' | 'ip' | 'process' | null;
  // 时间范围
  timeRange: TimeRange | null;
  // 筛选条件
  filters: StorylineFilters;
  // AI Copilot 状态
  copilotOpen: boolean;
  // AI Copilot 上下文
  copilotContext: {
    storylineId?: string;
    entityId?: string;
    entityType?: string;
  };
}

// Actions 接口
export interface AnalysisActions {
  // 设置当前视图
  setCurrentView: (view: AnalysisView) => void;
  // 选择故事线
  selectStoryline: (storylineId: string | null) => void;
  // 选择实体
  selectEntity: (entityId: string | null, entityType?: 'host' | 'user' | 'ip' | 'process' | null) => void;
  // 设置时间范围
  setTimeRange: (timeRange: TimeRange | null) => void;
  // 更新筛选条件
  updateFilters: (filters: Partial<StorylineFilters>) => void;
  // 清除所有筛选
  clearFilters: () => void;
  // 切换 Copilot 面板
  toggleCopilot: () => void;
  // 设置 Copilot 上下文
  setCopilotContext: (context: AnalysisState['copilotContext']) => void;
}

// 组合状态和动作类型
export type UseAnalysisStore = AnalysisState & AnalysisActions;

// 默认筛选条件
const defaultFilters: StorylineFilters = {
  severities: [],
  assetTypes: [],
  mitreTactics: [],
  confidenceRange: { min: 0, max: 100 },
  sources: [],
};

// 创建 Zustand store
export const useAnalysisStore = create<UseAnalysisStore>()(
  persist(
    (set) => ({
      // 初始状态
      currentView: 'alerts',
      selectedStorylineId: null,
      selectedEntityId: null,
      selectedEntityType: null,
      timeRange: null,
      filters: defaultFilters,
      copilotOpen: false,
      copilotContext: {},

      // Actions
      setCurrentView: (view) => set({ currentView: view }),

      selectStoryline: (storylineId) => set({
        selectedStorylineId: storylineId,
        copilotContext: storylineId ? { ...useAnalysisStore.getState().copilotContext, storylineId } : useAnalysisStore.getState().copilotContext,
      }),

      selectEntity: (entityId, entityType) => set({
        selectedEntityId: entityId,
        selectedEntityType: entityType ?? null,
        copilotContext: entityId ? { ...useAnalysisStore.getState().copilotContext, entityId, entityType } : useAnalysisStore.getState().copilotContext,
      }),

      setTimeRange: (timeRange) => set({ timeRange }),

      updateFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),

      clearFilters: () => set({ filters: defaultFilters }),

      toggleCopilot: () => set((state) => ({ copilotOpen: !state.copilotOpen })),

      setCopilotContext: (context) => set({ copilotContext: context }),
    }),
    {
      name: 'analysis-storage',
      // 只持久化这些字段
      partialize: (state) => ({
        currentView: state.currentView,
        timeRange: state.timeRange,
        selectedStorylineId: state.selectedStorylineId,
      }),
    }
  )
);
