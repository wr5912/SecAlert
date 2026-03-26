/**
 * 分析模块 API 端点
 * 提供故事线、攻击图、时间线等分析功能的 API 调用
 */

import type {
  Storyline,
  StorylineFilters,
  AttackNode,
  AttackEdge,
  TimelineEvent,
  TimeRange,
  AssetContext,
  HuntingQuery,
  HuntingResult,
} from '../types/analysis';

// 获取故事线列表
export async function fetchStorylines(
  filters: StorylineFilters
): Promise<Storyline[]> {
  // TODO: Phase 10 后端联调时替换为真实 API 调用
  // 暂时返回空数组作为占位
  console.log('[API] fetchStorylines called with filters:', filters);
  return [];
}

// 获取攻击图数据
export async function fetchAttackGraph(
  storylineId: string,
  timeRange?: TimeRange
): Promise<{ nodes: AttackNode[]; edges: AttackEdge[] }> {
  // TODO: Phase 10 后端联调时替换为真实 API 调用
  // 暂时返回空图作为占位
  console.log('[API] fetchAttackGraph called for storyline:', storylineId, 'timeRange:', timeRange);
  return { nodes: [], edges: [] };
}

// 获取时间线事件
export async function fetchTimeline(
  timeRange: TimeRange,
  sources?: string[]
): Promise<TimelineEvent[]> {
  // TODO: Phase 10 后端联调时替换为真实 API 调用
  // 暂时返回空数组作为占位
  console.log('[API] fetchTimeline called for timeRange:', timeRange, 'sources:', sources);
  return [];
}

// 获取资产上下文
export async function fetchAssetContext(
  assetId: string
): Promise<AssetContext> {
  // TODO: Phase 10 后端联调时替换为真实 API 调用
  // 暂时返回空对象作为占位
  console.log('[API] fetchAssetContext called for assetId:', assetId);
  return {
    assetId,
    assetType: 'unknown',
    hostname: undefined,
    ip: undefined,
    os: undefined,
    firstSeen: '',
    lastSeen: '',
    riskLevel: 'low',
    alerts: [],
    relatedAssets: [],
    threatIntelMatches: [],
  };
}

// 执行威胁狩猎查询
export async function fetchHuntingResults(
  query: HuntingQuery
): Promise<HuntingResult> {
  // TODO: Phase 10 后端联调时替换为真实 API 调用
  // 暂时返回空结果作为占位
  console.log('[API] fetchHuntingResults called with query:', query);
  return {
    total: 0,
    events: [],
    visualization: undefined,
  };
}
