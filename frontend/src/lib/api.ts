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
 * 从后端 API 获取真实的统计指标
 */
export async function fetchMetrics(): Promise<DashboardMetrics> {
  try {
    const response = await fetch(`${API_BASE}/metrics/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    // 返回空数据而不是硬编码值
    return {
      total: 0,
      truePositives: 0,
      falsePositiveRate: 0,
      resolutionRate: 0,
      trends: [],
      bySeverity: [
        { severity: 'critical', count: 0 },
        { severity: 'high', count: 0 },
        { severity: 'medium', count: 0 },
        { severity: 'low', count: 0 },
      ],
    };
  }
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