/**
 * 资产上下文面板组件
 * 360度资产信息展示，包含资产、威胁情报、行为三个标签页
 */

import { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../stores/analysisStore';
import { fetchAssetContext } from '../../api/analysisEndpoints';
import type { AssetContext } from '../../types/analysis';

// 标签页类型
type TabType = 'asset' | 'threat_intel' | 'behavior';

// ContextPanel 属性
export interface ContextPanelProps {
  assetId?: string;
  onClose?: () => void;
}

export function ContextPanel({ assetId, onClose }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('asset');
  const [data, setData] = useState<AssetContext | null>(null);
  const [loading, setLoading] = useState(false);

  // 从 store 获取选中的实体
  const selectedEntityId = useAnalysisStore((state) => state.selectedEntityId);
  const targetAssetId = assetId ?? selectedEntityId ?? undefined;

  // 加载资产上下文数据
  useEffect(() => {
    if (!targetAssetId) return;

    const assetIdToFetch: string = targetAssetId;

    async function loadContext() {
      setLoading(true);
      try {
        const context = await fetchAssetContext(assetIdToFetch);
        setData(context);
      } catch (error) {
        console.error('[ContextPanel] Failed to load asset context:', error);
      } finally {
        setLoading(false);
      }
    }
    loadContext();
  }, [targetAssetId]);

  // 标签页配置
  const tabs: { id: TabType; label: string }[] = [
    { id: 'asset', label: '资产' },
    { id: 'threat_intel', label: '威胁情报' },
    { id: 'behavior', label: '行为' },
  ];

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
      {/* 头部 */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700">
        <h2 className="font-semibold text-slate-200">上下文面板</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            ×
          </button>
        )}
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-slate-400">加载中...</span>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-slate-400">选择实体查看详情</span>
          </div>
        ) : (
          <>
            {activeTab === 'asset' && <AssetTab data={data} />}
            {activeTab === 'threat_intel' && <ThreatIntelTab data={data} />}
            {activeTab === 'behavior' && <BehaviorTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}

// 资产标签页内容
function AssetTab({ data }: { data: AssetContext }) {
  return (
    <div className="space-y-4">
      {/* 基础信息 */}
      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-2">基础信息</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">资产ID</span>
            <span className="text-slate-200">{data.assetId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">类型</span>
            <span className="text-slate-200">{data.assetType}</span>
          </div>
          {data.hostname && (
            <div className="flex justify-between">
              <span className="text-slate-500">主机名</span>
              <span className="text-slate-200">{data.hostname}</span>
            </div>
          )}
          {data.ip && (
            <div className="flex justify-between">
              <span className="text-slate-500">IP 地址</span>
              <span className="text-slate-200">{data.ip}</span>
            </div>
          )}
          {data.os && (
            <div className="flex justify-between">
              <span className="text-slate-500">操作系统</span>
              <span className="text-slate-200">{data.os}</span>
            </div>
          )}
        </div>
      </section>

      {/* 安全状态 */}
      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-2">安全状态</h3>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              data.riskLevel === 'critical'
                ? 'bg-red-500/20 text-red-400'
                : data.riskLevel === 'high'
                ? 'bg-orange-500/20 text-orange-400'
                : data.riskLevel === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {data.riskLevel.toUpperCase()}
          </span>
        </div>
      </section>

      {/* 关联图谱 */}
      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-2">关联实体</h3>
        <div className="flex flex-wrap gap-2">
          {data.relatedAssets.map((asset, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-slate-800 rounded text-slate-300"
            >
              {asset}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

// 威胁情报标签页内容
function ThreatIntelTab({ data }: { data: AssetContext }) {
  if (data.threatIntelMatches.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-slate-400">暂无威胁情报匹配</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.threatIntelMatches.map((match, idx) => (
        <div key={idx} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-slate-200">{match.indicator}</span>
            <span className="text-xs text-slate-500">{match.confidence}%</span>
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-slate-500">类型:</span> {match.type}
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-slate-500">来源:</span> {match.source}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            最后可见: {new Date(match.lastSeen).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// 行为标签页内容
function BehaviorTab({ data }: { data: AssetContext }) {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-2">活动时间</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">首次出现</span>
            <span className="text-slate-200">
              {new Date(data.firstSeen).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">最后活动</span>
            <span className="text-slate-200">
              {new Date(data.lastSeen).toLocaleDateString()}
            </span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-2">关联告警</h3>
        <div className="text-sm text-slate-200">
          {data.alerts.length} 条告警
        </div>
      </section>
    </div>
  );
}

export default ContextPanel;
