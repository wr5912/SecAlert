/**
 * 威胁狩猎工作台组件
 * 可视化查询构建器 + 查询结果展示
 */

import { useState } from 'react';
import { QueryBuilder } from './QueryBuilder';
import type { HuntingQuery, HuntingResult } from '../../types/analysis';

// HuntingWorkbench 属性
export interface HuntingWorkbenchProps {
  onSaveAsRule?: (query: HuntingQuery) => void;
  onSaveAsTask?: (query: HuntingQuery) => void;
}

export function HuntingWorkbench({
  onSaveAsRule,
  onSaveAsTask,
}: HuntingWorkbenchProps) {
  const [currentQuery, setCurrentQuery] = useState<HuntingQuery | null>(null);
  const [result] = useState<HuntingResult | null>(null);
  const [history, setHistory] = useState<HuntingQuery[]>([]);

  // 处理查询构建
  const handleQueryChange = (query: HuntingQuery) => {
    setCurrentQuery(query);
  };

  // 执行查询
  const handleExecute = async () => {
    if (!currentQuery) return;

    // 添加到历史记录
    setHistory((prev) => [currentQuery, ...prev.slice(0, 9)]);

    // TODO: 调用 API 执行查询
    console.log('[HuntingWorkbench] Executing query:', currentQuery);
  };

  return (
    <div className="flex h-full">
      {/* 左侧查询构建器 */}
      <div className="w-1/3 border-r border-slate-700 p-4 overflow-y-auto">
        <h3 className="text-sm font-medium text-slate-400 mb-4">查询构建器</h3>
        <QueryBuilder
          onChange={handleQueryChange}
          onExecute={handleExecute}
        />
      </div>

      {/* 右侧结果区域 */}
      <div className="flex-1 flex flex-col">
        {/* 结果头部 */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700">
          <h3 className="font-medium text-slate-200">查询结果</h3>
          {currentQuery && (
            <div className="flex gap-2">
              <button
                onClick={() => onSaveAsRule?.(currentQuery)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              >
                保存为检测规则
              </button>
              <button
                onClick={() => onSaveAsTask?.(currentQuery)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              >
                保存为巡检任务
              </button>
            </div>
          )}
        </div>

        {/* 结果内容 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {result ? (
            <div className="space-y-4">
              {/* 统计信息 */}
              <div className="text-sm text-slate-400">
                共找到 {result.total} 条结果
              </div>

              {/* 表格视图 */}
              {result.visualization?.type === 'table' && (
                <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-400">时间</th>
                        <th className="px-4 py-2 text-left text-slate-400">事件</th>
                        <th className="px-4 py-2 text-left text-slate-400">来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.events.slice(0, 10).map((event) => (
                        <tr key={event.id} className="border-t border-slate-700">
                          <td className="px-4 py-2 text-slate-300">
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-slate-300">
                            {event.eventType}
                          </td>
                          <td className="px-4 py-2 text-slate-300">{event.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 可视化视图 */}
              {result.visualization?.type === 'chart' && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400">可视化图表占位</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-slate-400 mb-2">暂无查询结果</p>
                <p className="text-sm text-slate-500">
                  使用左侧查询构建器开始威胁狩猎
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 历史记录 */}
        {history.length > 0 && (
          <div className="border-t border-slate-700 p-4">
            <h4 className="text-xs font-medium text-slate-500 mb-2">历史查询</h4>
            <div className="flex flex-wrap gap-2">
              {history.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuery(q)}
                  className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                >
                  {q.filters.slice(0, 2).map((f) => f.value).join(', ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HuntingWorkbench;
