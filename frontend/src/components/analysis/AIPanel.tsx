/**
 * AI Copilot 面板组件
 * 提供上下文感知的 AI 辅助分析功能
 */

import { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../stores/analysisStore';
import type { AISuggestion } from '../../types/analysis';

// AI 面板状态
type AIPanelStatus = 'idle' | 'querying' | 'responding' | 'error';

// AIPanel 属性
export interface AIPanelProps {
  onExport?: (format: 'pdf' | 'markdown' | 'json') => void;
}

export function AIPanel({ onExport }: AIPanelProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AIPanelStatus>('idle');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  // 从 store 订阅上下文变化
  const copilotContext = useAnalysisStore((state) => state.copilotContext);
  const selectedStorylineId = useAnalysisStore((state) => state.selectedStorylineId);
  const selectedEntityId = useAnalysisStore((state) => state.selectedEntityId);

  // 当上下文变化时，更新智能推荐
  useEffect(() => {
    if (selectedStorylineId || selectedEntityId) {
      // 生成上下文相关的智能推荐
      const contextSuggestions: AISuggestion[] = [];

      if (selectedStorylineId) {
        contextSuggestions.push({
          action: '查看攻击路径',
          reasoning: `当前选择了故事线 ${selectedStorylineId}，建议查看详细攻击路径以了解攻击链全貌`,
          confidence: 0.9,
          evidence: ['关联告警数量 > 5', '置信度 > 80%'],
        });
      }

      if (selectedEntityId) {
        contextSuggestions.push({
          action: '查询实体历史',
          reasoning: `选中了实体 ${selectedEntityId}，可以查看该实体的历史活动记录`,
          confidence: 0.85,
          evidence: ['实体类型匹配', '最近 24 小时有活动'],
        });
      }

      setSuggestions(contextSuggestions);
    }
  }, [selectedStorylineId, selectedEntityId]);

  // 处理查询提交
  const handleSubmit = async () => {
    if (!query.trim()) return;

    setStatus('querying');
    // TODO: 实现实际的 AI 查询功能
    console.log('[AI Panel] Query submitted:', query, 'Context:', copilotContext);

    // 模拟响应
    setTimeout(() => {
      setStatus('responding');
      setSuggestions([
        {
          action: '建议分析',
          reasoning: '基于当前上下文和查询内容，AI 建议进行以下分析步骤',
          confidence: 0.75,
          evidence: ['数据源完整', '时间范围合理'],
        },
      ]);
      setStatus('idle');
    }, 1000);
  };

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
      {/* 头部 */}
      <div className="h-14 px-4 flex items-center border-b border-slate-700">
        <h2 className="font-semibold text-slate-200">AI 调查助手</h2>
      </div>

      {/* 查询输入 */}
      <div className="p-4 border-b border-slate-700">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入自然语言查询..."
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          disabled={status === 'querying' || !query.trim()}
          className="mt-2 w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {status === 'querying' ? '分析中...' : '提交查询'}
        </button>
      </div>

      {/* 智能推荐 */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">智能推荐</h3>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-cyan-400">
                  {suggestion.action}
                </span>
                <span className="text-xs text-slate-500">
                  置信度 {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
              {/* reasoning 字段说明推理过程 */}
              <p className="text-xs text-slate-400 mb-2">
                {suggestion.reasoning}
              </p>
              {suggestion.evidence.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {suggestion.evidence.map((e, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-xs bg-slate-700 rounded text-slate-400"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 导出功能 */}
      <div className="p-4 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 mb-2">证据导出</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onExport?.('pdf')}
            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
          >
            PDF
          </button>
          <button
            onClick={() => onExport?.('markdown')}
            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
          >
            Markdown
          </button>
          <button
            onClick={() => onExport?.('json')}
            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
          >
            JSON
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AIPanel;
