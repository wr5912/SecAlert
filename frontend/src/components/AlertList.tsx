/** 告警列表组件

Per D-06: 默认只显示 Critical + High 严重度告警
支持 severity 筛选和 Tab 切换（活跃/已抑制）
*/

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import type { AttackChain, Severity, TabMode, AttackChainListResponse } from '../types';
import { fetchChains, fetchFalsePositives } from '../api/client';

interface AlertListProps {
  onSelectChain: (chainId: string) => void;
  selectedChainId?: string;
}

export function AlertList({ onSelectChain, selectedChainId }: AlertListProps) {
  const [tab, setTab] = useState<TabMode>('active');
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [chains, setChains] = useState<AttackChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载告警列表
  useEffect(() => {
    loadChains();
  }, [tab, severity]);

  async function loadChains() {
    setLoading(true);
    setError(null);
    try {
      let response: AttackChainListResponse;
      if (tab === 'active') {
        response = await fetchChains(50, 0, severity);
        // 前端过滤只保留 Critical/High（如果 severity=all）
        if (severity === 'all') {
          response.chains = response.chains.filter(
            c => c.max_severity === 'critical' || c.max_severity === 'high'
          );
        }
      } else {
        response = await fetchFalsePositives(50, 0);
      }
      setChains(response.chains);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab 切换 */}
      <div className="flex gap-4 border-b border-slate-200">
        <TabButton
          active={tab === 'active'}
          onClick={() => setTab('active')}
          icon={<AlertCircle className="w-4 h-4" />}
        >
          活跃告警
        </TabButton>
        <TabButton
          active={tab === 'suppressed'}
          onClick={() => setTab('suppressed')}
          icon={<CheckCircle className="w-4 h-4" />}
        >
          已抑制告警
        </TabButton>
      </div>

      {/* 严重度筛选（仅活跃告警 tab 显示） */}
      {tab === 'active' && (
        <div className="flex gap-2">
          <SeverityFilter
            value={severity}
            onChange={setSeverity}
          />
          <button
            onClick={loadChains}
            className="p-2 text-slate-500 hover:text-slate-700"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-8 text-slate-500">
          加载中...
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && chains.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">暂无需要处理的告警</p>
          <p className="text-sm text-slate-400">所有 Critical/High 告警已处理完毕</p>
        </div>
      )}

      {/* 告警列表 */}
      {!loading && !error && chains.length > 0 && (
        <div className="space-y-2">
          {chains.map((chain) => (
            <ChainRow
              key={chain.chain_id}
              chain={chain}
              selected={chain.chain_id === selectedChainId}
              onClick={() => onSelectChain(chain.chain_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tab 按钮
function TabButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-1 py-2 border-b-2 transition-colors ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// 严重度筛选
function SeverityFilter({
  value,
  onChange
}: {
  value: Severity | 'all';
  onChange: (v: Severity | 'all') => void;
}) {
  const options: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low'];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Severity | 'all')}
      className="px-3 py-1.5 border border-slate-300 rounded text-sm"
    >
      <option value="all">全部</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  );
}

// 单条告警行
function ChainRow({
  chain,
  selected,
  onClick
}: {
  chain: AttackChain;
  selected: boolean;
  onClick: () => void;
}) {
  const srcIp = chain.alerts[0]?.src_ip || '未知';
  const primaryBehavior = chain.alerts[0]?.alert_signature || '未知行为';

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        selected ? 'ring-2 ring-blue-500' : 'hover:bg-slate-50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Badge severity={chain.max_severity}>
            {chain.max_severity.toUpperCase()}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-900 font-mono">{srcIp}</span>
              <span className="text-slate-400">→</span>
              <span className="text-slate-900 font-mono">{chain.asset_ip || '未知'}</span>
            </div>
            <div className="text-sm text-slate-500 truncate mt-1">
              {primaryBehavior}
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {chain.start_time ? new Date(chain.start_time).toLocaleString() : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
