/**
 * SecAlert API 客户端
 * 集成 TanStack Query，提供数据获取和缓存能力
 */

import { QueryClient } from '@tanstack/react-query';
import type {
  AttackChainListResponse,
  RemediationResponse,
  AcknowledgeResponse,
  Severity,
} from '../types';

// 保留原有 API client 中的函数
import {
  fetchChains as originalFetchChains,
  fetchFalsePositives,
  fetchRemediation as originalFetchRemediation,
  acknowledgeAlert,
  restoreAlert,
} from '../api/client';

const API_BASE = '/api';

/**
 * TanStack Query 客户端配置
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Dashboard 指标数据类型
 */
export interface DashboardMetrics {
  total: number;
  truePositives: number;
  falsePositiveRate: number;
  resolutionRate: number;
  trends: { time: string; count: number }[];
  bySeverity: { severity: Severity; count: number }[];
}

/**
 * 告警列表筛选条件
 */
export interface ChainFilters {
  severity?: Severity | 'all';
  status?: 'active' | 'suppressed' | 'all';
  sourceType?: string | 'all';
  searchQuery?: string;
  dateRange?: { start: string; end: string };
  sortBy?: 'time' | 'severity' | 'count';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * 获取告警列表
 */
export async function fetchChains(
  limit: number = 50,
  offset: number = 0,
  severity?: Severity | 'all'
): Promise<AttackChainListResponse> {
  return originalFetchChains(limit, offset, severity);
}

/**
 * 获取单个告警链详情
 */
export async function fetchChainById(chainId: string): Promise<RemediationResponse> {
  const response = await fetch(`${API_BASE}/remediation/chains/${chainId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chain ${chainId}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 获取 Dashboard 指标数据
 * TODO: 后端实现后替换为真实 API
 */
export async function fetchMetrics(): Promise<DashboardMetrics> {
  // 模拟数据 - 后端实现前使用
  return {
    total: 1234,
    truePositives: 89,
    falsePositiveRate: 72.8,
    resolutionRate: 85.3,
    trends: [
      { time: '2024-01-01', count: 120 },
      { time: '2024-01-02', count: 98 },
      { time: '2024-01-03', count: 145 },
      { time: '2024-01-04', count: 87 },
      { time: '2024-01-05', count: 112 },
      { time: '2024-01-06', count: 156 },
      { time: '2024-01-07', count: 134 },
    ],
    bySeverity: [
      { severity: 'critical', count: 45 },
      { severity: 'high', count: 123 },
      { severity: 'medium', count: 234 },
      { severity: 'low', count: 456 },
    ],
  };
}

/**
 * 获取处置建议
 */
export async function fetchRemediation(chainId: string): Promise<RemediationResponse> {
  return originalFetchRemediation(chainId);
}

/**
 * 确认已通报
 */
export async function acknowledgeAlertFn(
  chainId: string,
  note?: string
): Promise<AcknowledgeResponse> {
  return acknowledgeAlert(chainId, note);
}

/**
 * 恢复误报
 */
export async function restoreAlertFn(chainId: string): Promise<{ chain_id: string; status: string; restored: boolean }> {
  return restoreAlert(chainId);
}