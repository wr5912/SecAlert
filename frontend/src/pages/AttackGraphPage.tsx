/**
 * 攻击图页面
 * 路由: /analysis/graph/:storyId
 * 交互式攻击链路可视化
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { AttackGraph } from '../components/analysis/AttackGraph';
import { ContextPanel } from '../components/analysis/ContextPanel';
import { useAnalysisStore } from '../stores/analysisStore';
import { fetchAttackGraph } from '../api/analysisEndpoints';
import type { AttackNode, AttackEdge } from '../types/analysis';

// Mock storyline data (TODO: replace with API call)
const mockStoryline = {
  id: '',
  confidence: 85,
  attackPhase: 'Lateral Movement',
  assetCount: 5,
  summary: '检测到可疑的横向移动行为',
};

export function AttackGraphPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const [nodes, setNodes] = useState<AttackNode[]>([]);
  const [edges, setEdges] = useState<AttackEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);

  // 从 store 获取选中的实体
  const selectedEntityId = useAnalysisStore((state) => state.selectedEntityId);
  const selectEntity = useAnalysisStore((state) => state.selectEntity);

  // 加载攻击图数据
  useEffect(() => {
    async function loadGraph() {
      if (!storyId) return;
      setLoading(true);
      try {
        const data = await fetchAttackGraph(storyId);
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (error) {
        console.error('[AttackGraphPage] Failed to load graph:', error);
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, [storyId]);

  // 处理节点点击
  const handleNodeClick = (nodeId: string) => {
    selectEntity(nodeId, 'host');
  };

  // 时间范围滑块变化
  const handleTimeRangeChange = (value: [number, number]) => {
    setTimeRange(value);
    // TODO: 触发重新查询获取指定时间范围内的数据
    console.log('[AttackGraphPage] Time range changed:', value);
  };

  if (!storyId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-400 mb-4">缺少故事线 ID</p>
        <Link
          to="/analysis/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回告警中心
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部: 故事线摘要 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/30">
        <div className="flex items-center gap-4">
          <Link
            to="/analysis/alerts"
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* 故事线信息 */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-cyan-400">
              {mockStoryline.confidence}%
            </span>
            <Badge severity="high" >
              {mockStoryline.attackPhase}
            </Badge>
            <span className="text-slate-400">
              {mockStoryline.assetCount} 个资产
            </span>
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="text-sm text-slate-500">
          故事线ID: {storyId}
        </div>
      </div>

      {/* 主内容区: 攻击图 + 右侧上下文面板 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 攻击图画布 */}
        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-slate-400">加载中...</span>
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-slate-400 mb-2">暂无攻击链路数据</p>
              <p className="text-sm text-slate-500">
                攻击图数据将在 Phase 10 后端联调后可用
              </p>
            </div>
          ) : (
            <div className="flex-1 p-4">
              <AttackGraph
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
              />
            </div>
          )}

          {/* 底部: 范围滑块时间轴控制器 (D-06) */}
          <div className="px-6 py-4 border-t border-slate-700">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 w-12">开始</span>
              <input
                type="range"
                min={0}
                max={100}
                value={timeRange[0]}
                onChange={(e) => handleTimeRangeChange([parseInt(e.target.value), timeRange[1]])}
                className="flex-1"
              />
              <span className="text-xs text-slate-400 w-12">结束</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-slate-400 w-12">结束</span>
              <input
                type="range"
                min={0}
                max={100}
                value={timeRange[1]}
                onChange={(e) => handleTimeRangeChange([timeRange[0], parseInt(e.target.value)])}
                className="flex-1"
              />
              <span className="text-xs text-slate-400 w-12">当前</span>
            </div>
          </div>
        </div>

        {/* 右侧: 上下文面板 */}
        <div className="w-80 flex-shrink-0 border-l border-slate-700">
          <ContextPanel assetId={selectedEntityId || undefined} />
        </div>
      </div>
    </div>
  );
}
