/**
 * 资产上下文页面
 * 路由: /analysis/assets/:assetId
 * 360度资产信息展示
 */

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ContextPanel } from '../components/analysis/ContextPanel';
import { Badge } from '../components/ui/Badge';
import { fetchAssetContext } from '../api/analysisEndpoints';
import { useState, useEffect } from 'react';
import type { AssetContext } from '../types/analysis';

export function AssetContextPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [assetContext, setAssetContext] = useState<AssetContext | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载资产上下文数据
  useEffect(() => {
    async function loadContext() {
      if (!assetId) return;
      setLoading(true);
      try {
        const data = await fetchAssetContext(assetId);
        setAssetContext(data);
      } catch (error) {
        console.error('[AssetContextPage] Failed to load asset context:', error);
      } finally {
        setLoading(false);
      }
    }
    loadContext();
  }, [assetId]);

  if (!assetId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-400 mb-4">缺少资产 ID</p>
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
      {/* 顶部: 资产信息摘要 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/30">
        <div className="flex items-center gap-4">
          <Link
            to="/analysis/alerts"
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* 资产信息 */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono text-slate-200">{assetId}</span>
            {assetContext && (
              <>
                <Badge severity={assetContext.riskLevel}>
                  {assetContext.riskLevel.toUpperCase()}
                </Badge>
                <span className="text-slate-400">
                  {assetContext.assetType}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="text-sm text-slate-500">
          资产上下文
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-slate-400">加载中...</span>
          </div>
        ) : assetContext ? (
          <>
            {/* 左侧: 关联实体图谱可视化 */}
            <div className="flex-1 border-r border-slate-700 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-4">关联实体图谱</h3>
              <div className="w-full h-full bg-slate-800/30 rounded-lg flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <p className="mb-2">关联实体图谱可视化</p>
                  <p className="text-sm">节点: {assetContext.relatedAssets.length} 个关联资产</p>
                  <p className="text-xs mt-1">将在 Phase 10 后端联调后可用</p>
                </div>
              </div>
            </div>

            {/* 右侧: ContextPanel */}
            <div className="w-96 flex-shrink-0">
              <ContextPanel assetId={assetId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-slate-400 mb-2">无法加载资产上下文</p>
            <p className="text-sm text-slate-500">
              资产数据将在 Phase 10 后端联调后可用
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
