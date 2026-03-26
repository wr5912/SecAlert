/**
 * 分析模块类型定义
 * 包含故事线、攻击图、时间线等相关类型
 */

// 严重级别枚举
export type Severity = 'critical' | 'high' | 'medium' | 'low';

// 故事线
export interface Storyline {
  id: string;
  confidence: number; // 0-100
  attackPhase: string;
  summary: string;
  assetCount: number;
  firstActivity: string;
  lastActivity: string;
  threatIntelMatch: number; // 0-100
  alerts: Alert[];
}

// 告警
export interface Alert {
  id: string;
  timestamp: string;
  source: string;
  signature: string;
  severity: Severity;
}

// 故事线筛选条件
export interface StorylineFilters {
  timeRange?: { start: string; end: string };
  severities?: Severity[];
  assetTypes?: string[];
  mitreTactics?: string[];
  confidenceRange?: { min: number; max: number };
  sources?: string[];
}

// 攻击节点类型
export type AttackNodeType = 'host' | 'user' | 'ip' | 'process';

// 攻击节点
export interface AttackNode {
  id: string;
  type: AttackNodeType;
  label: string;
  severity?: Severity;
  data: Record<string, unknown>;
}

// 攻击边类型
export type AttackEdgeType = 'confirmed' | 'suspected';

// 攻击边
export interface AttackEdge {
  id: string;
  source: string;
  target: string;
  type: AttackEdgeType;
  animated?: boolean;
}

// 时间线层级
export type TimelineLayer = 'network' | 'endpoint' | 'identity' | 'application';

// 时间线事件
export interface TimelineEvent {
  id: string;
  timestamp: string;
  layer: TimelineLayer;
  source: string;
  eventType: string;
  rawLog?: string;
  entities: string[];
  isAnomaly?: boolean;
}

// AI 建议（包含推理过程）
export interface AISuggestion {
  action: string;
  reasoning: string; // 为什么推荐这个操作
  confidence: number;
  evidence: string[];
}

// 时间范围
export interface TimeRange {
  start: string;
  end: string;
}

// 资产上下文
export interface AssetContext {
  assetId: string;
  assetType: string;
  hostname?: string;
  ip?: string;
  os?: string;
  firstSeen: string;
  lastSeen: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  alerts: Alert[];
  relatedAssets: string[];
  threatIntelMatches: ThreatIntelMatch[];
}

// 威胁情报匹配
export interface ThreatIntelMatch {
  indicator: string;
  type: string;
  source: string;
  confidence: number;
  lastSeen: string;
}

// 狩猎查询
export interface HuntingQuery {
  filters: {
    field: string;
    operator: string;
    value: string;
  }[];
  logic: 'AND' | 'OR';
  timeRange?: TimeRange;
}

// 狩猎结果
export interface HuntingResult {
  total: number;
  events: TimelineEvent[];
  visualization?: {
    type: 'table' | 'chart';
    data: unknown;
  };
}
