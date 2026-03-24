/** SecAlert API 客户端 */

import type {
  AttackChainListResponse,
  RemediationResponse,
  AcknowledgeResponse,
  Severity
} from '../types';

const API_BASE = '/api';

// 获取告警列表
export async function fetchChains(
  limit: number = 50,
  offset: number = 0,
  severity?: Severity | 'all'
): Promise<AttackChainListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (severity && severity !== 'all') {
    params.set('status', 'active');
    params.set('severity', severity);
  } else if (severity === 'all') {
    params.set('status', 'active');
  } else {
    // 默认: 只获取 active 状态的 Critical/High
    params.set('status', 'active');
  }

  const response = await fetch(`${API_BASE}/chains?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains: ${response.statusText}`);
  }
  return response.json();
}

// 获取误报列表
export async function fetchFalsePositives(
  limit: number = 50,
  offset: number = 0
): Promise<AttackChainListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${API_BASE}/chains?${params}&status=false_positive`);
  if (!response.ok) {
    throw new Error(`Failed to fetch false positives: ${response.statusText}`);
  }
  return response.json();
}

// 获取处置建议
export async function fetchRemediation(chainId: string): Promise<RemediationResponse> {
  const response = await fetch(`${API_BASE}/remediation/chains/${chainId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch remediation: ${response.statusText}`);
  }
  return response.json();
}

// 确认已通报
export async function acknowledgeAlert(
  chainId: string,
  note?: string
): Promise<AcknowledgeResponse> {
  const params = new URLSearchParams();
  if (note) {
    params.set('note', note);
  }

  const response = await fetch(
    `${API_BASE}/remediation/chains/${chainId}/acknowledge?${params}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    throw new Error(`Failed to acknowledge: ${response.statusText}`);
  }
  return response.json();
}

// 恢复误报
export async function restoreAlert(chainId: string): Promise<{ chain_id: string; status: string; restored: boolean }> {
  const response = await fetch(`${API_BASE}/remediation/chains/${chainId}/restore`, {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error(`Failed to restore: ${response.statusText}`);
  }
  return response.json();
}
