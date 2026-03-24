/** SecAlert 前端类型定义 */

// 严重度级别
export type Severity = 'critical' | 'high' | 'medium' | 'low';

// 攻击链状态
export type ChainStatus = 'active' | 'resolved' | 'false_positive';

// 告警模型
export interface Alert {
  alert_id: string;
  timestamp?: string;
  src_ip?: string;
  dst_ip?: string;
  event_type?: string;
  severity: number;
  alert_signature?: string;
  mitre_tactic?: string;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
}

// 攻击链模型
export interface AttackChain {
  chain_id: string;
  start_time?: string;
  end_time?: string;
  alert_count: number;
  max_severity: Severity;
  status: ChainStatus;
  asset_ip?: string;
  alerts: Alert[];
}

// 攻击链列表响应
export interface AttackChainListResponse {
  chains: AttackChain[];
  total: number;
  limit: number;
  offset: number;
}

// 简化时间线节点
export interface TimelineNode {
  type: 'source' | 'behavior' | 'target' | 'phase';
  label: string;
  icon: string;
}

// 简化时间线
export interface Timeline {
  nodes: TimelineNode[];
  summary: string;
}

// 处置建议
export interface Recommendation {
  short_action: string;
  detailed_steps: string[];
  attck_ref: string;
  source: 'template' | 'llm' | 'generic';
  technique_id: string;
}

// 处置建议响应
export interface RemediationResponse {
  chain_id: string;
  severity: Severity;
  status: ChainStatus;
  recommendation: Recommendation;
  timeline: Timeline;
  asset_ip?: string;
  src_ip?: string;
}

// 响应结果
export interface AcknowledgeResponse {
  chain_id: string;
  status: ChainStatus;
  acknowledged: boolean;
  note?: string;
}

// UI 状态
export type ViewMode = 'list' | 'detail';
export type TabMode = 'active' | 'suppressed';
