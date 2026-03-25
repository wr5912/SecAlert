/**
 * 告警列表页面
 * 支持多维度筛选，筛选条件与 URL searchParams 同步
 */

import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { AlertFilters } from '../components/alerts/AlertFilters';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { fetchChains, type ChainFilters } from '../lib/api';
import type { AttackChain, Severity } from '../types';
import { formatDate } from '../lib/utils';
import { useChatStore } from '../stores/chatStore';

export function AlertListPage() {
  const setContext = useChatStore(state => state.setContext);

  // 设置聊天上下文为列表视图
  useEffect(() => {
    setContext({ type: 'list' });
  }, [setContext]);

  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL 恢复筛选状态
  const severity = (searchParams.get('severity') as Severity | 'all') || 'all';
  const status = (searchParams.get('status') as 'active' | 'suppressed' | 'all') || 'active';
  const search = searchParams.get('search') || '';
  const sourceType = searchParams.get('sourceType') || 'all';

  // 构建筛选条件
  const filters: ChainFilters = {
    severity,
    status: status === 'all' ? undefined : status,
    searchQuery: search || undefined,
    sourceType: sourceType === 'all' ? undefined : sourceType,
    limit: 50,
    offset: 0,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['chains', filters],
    queryFn: () => fetchChains(filters.limit!, filters.offset!, filters.severity),
  });

  // 更新 URL 参数
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-4">
      {/* 筛选组件 */}
      <AlertFilters
        severity={severity}
        status={status}
        search={search}
        sourceType={sourceType}
        onSeverityChange={(v) => updateFilter('severity', v)}
        onStatusChange={(v) => updateFilter('status', v)}
        onSearchChange={(v) => updateFilter('search', v)}
        onSourceTypeChange={(v) => updateFilter('sourceType', v)}
      />

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          共 {data?.total || 0} 条告警
        </p>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-500 hover:text-slate-700"
          title="刷新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-8 text-slate-500">加载中...</div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-8 text-red-500">
          加载失败: {error.message}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && !error && (!data?.chains || data.chains.length === 0) && (
        <div className="text-center py-12">
          <p className="text-slate-500">暂无告警</p>
        </div>
      )}

      {/* 告警列表 */}
      {!isLoading && !error && data?.chains && data.chains.length > 0 && (
        <div className="space-y-2">
          {data.chains.map((chain) => (
            <AlertListItem key={chain.chain_id} chain={chain} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 告警列表项
 */
function AlertListItem({ chain }: { chain: AttackChain }) {
  const srcIp = chain.alerts[0]?.src_ip || '未知';
  const primaryBehavior = chain.alerts[0]?.alert_signature || '未知行为';

  return (
    <Card
      className="hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={() => window.location.href = `/alerts/${chain.chain_id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Badge severity={chain.max_severity}>
            {chain.max_severity.toUpperCase()}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-900 font-mono">{srcIp}</span>
              <span className="text-slate-400">-&gt;</span>
              <span className="text-slate-900 font-mono">{chain.asset_ip || '未知'}</span>
            </div>
            <div className="text-sm text-slate-500 truncate mt-1">
              {primaryBehavior}
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {chain.start_time ? formatDate(chain.start_time) : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}