/**
 * 威胁狩猎页面
 * 路由: /analysis/hunting
 * 可视化查询构建器 + 查询结果展示
 */

import { useState } from 'react';
import { QueryBuilder } from '../components/analysis/QueryBuilder';
import { fetchHuntingResults } from '../api/analysisEndpoints';
import type { HuntingQuery, HuntingResult } from '../types/analysis';

// 视图类型
type ViewMode = 'table' | 'chart';

// 视图模式选项
const viewModeOptions: { value: ViewMode; label: string }[] = [
  { value: 'table', label: '表格' },
  { value: 'chart', label: '图表' },
];

export function HuntingPage() {
  const [currentQuery, setCurrentQuery] = useState<HuntingQuery | null>(null);
  const [result, setResult] = useState<HuntingResult | null>(null);
  const [history, setHistory] = useState<HuntingQuery[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [loading, setLoading] = useState(false);

  // 从历史记录加载查询
  const handleLoadFromHistory = (query: HuntingQuery) => {
    setCurrentQuery(query);
  };

  // 处理查询变化
  const handleQueryChange = (query: HuntingQuery) => {
    setCurrentQuery(query);
  };

  // 执行查询
  const handleExecute = async () => {
    if (!currentQuery || currentQuery.filters.length === 0) return;

    setLoading(true);
    // 添加到历史记录
    setHistory((prev) => [currentQuery, ...prev.slice(0, 9)]);
    setViewMode('table');

    try {
      const data = await fetchHuntingResults(currentQuery);
      setResult(data);
    } catch (error) {
      console.error('[HuntingPage] Query execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存为检测规则
  const handleSaveAsRule = () => {
    if (!currentQuery) return;
    console.log('[HuntingPage] Save as detection rule:', currentQuery);
    // TODO: 实现保存检测规则功能
    alert('检测规则保存功能将在 Phase 10 实现');
  };

  // 保存为巡检任务
  const handleSaveAsTask = () => {
    if (!currentQuery) return;
    console.log('[HuntingPage] Save as task:', currentQuery);
    // TODO: 实现保存巡检任务功能
    alert('巡检任务保存功能将在 Phase 10 实现');
  };

  return (
    <div className="flex h-full">
      {/* 左侧查询构建器 */}
      <div className="w-96 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-4">查询构建器</h3>
          <QueryBuilder
            onChange={handleQueryChange}
            onExecute={handleExecute}
          />
        </div>

        {/* 历史记录 */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-xs font-medium text-slate-500 mb-2">历史查询</h4>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadFromHistory(q)}
                  className="w-full p-2 text-left text-sm bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded transition-colors"
                >
                  <div className="text-slate-300 truncate">
                    {q.filters.map((f) => `${f.field} ${f.operator} ${f.value}`).join(` ${q.logic} `)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {q.filters.length} 个条件
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂无历史查询</p>
          )}
        </div>
      </div>

      {/* 右侧结果区域 */}
      <div className="flex-1 flex flex-col">
        {/* 结果头部 */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700">
          <h3 className="font-medium text-slate-200">查询结果</h3>
          <div className="flex items-center gap-4">
            {/* 视图切换 */}
            {result && (
              <div className="flex gap-1">
                {viewModeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setViewMode(opt.value)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      viewMode === opt.value
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* 保存按钮 */}
            {currentQuery && currentQuery.filters.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAsRule}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  保存规则
                </button>
                <button
                  onClick={handleSaveAsTask}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  保存任务
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 结果内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-slate-400">执行查询中...</span>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* 统计信息 */}
              <div className="text-sm text-slate-400">
                共找到 {result.total} 条结果
              </div>

              {/* 表格视图 */}
              {viewMode === 'table' && result.events.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-400">时间</th>
                        <th className="px-4 py-2 text-left text-slate-400">事件</th>
                        <th className="px-4 py-2 text-left text-slate-400">来源</th>
                        <th className="px-4 py-2 text-left text-slate-400">实体</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.events.map((event) => (
                        <tr key={event.id} className="border-t border-slate-700">
                          <td className="px-4 py-2 text-slate-300">
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-slate-300">
                            {event.eventType}
                          </td>
                          <td className="px-4 py-2 text-slate-300">{event.source}</td>
                          <td className="px-4 py-2 text-slate-300">
                            {event.entities.slice(0, 3).join(', ')}
                            {event.entities.length > 3 && '...'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 图表视图 */}
              {viewMode === 'chart' && (
                <div className="bg-slate-800/50 rounded-lg p-8">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <p className="mb-2">可视化图表</p>
                    <p className="text-sm">将在 Phase 10 后端联调后可用</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-slate-400 mb-2">暂无查询结果</p>
              <p className="text-sm text-slate-500">
                使用左侧查询构建器开始威胁狩猎
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
