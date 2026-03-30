/**
 * AI Copilot 面板组件
 * 提供上下文感知的 AI 辅助分析功能 - Tactical Command Center 风格
 */

import { useState, useEffect } from 'react';
import { Bot, Send } from 'lucide-react';
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
    <aside className="w-80 bg-surface border-l border-border flex flex-col relative">
      {/* 顶部 accent 线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent via-accent/50 to-transparent" />

      {/* 头部 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-heading font-semibold text-slate-200">AI Copilot</h3>
          <p className="text-xs text-slate-500">智能告警分析助手</p>
        </div>
      </div>

      {/* 查询输入 */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入您的安全问题..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 resize-none"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={status === 'querying' || !query.trim()}
            className="absolute right-2 bottom-2 p-2 bg-accent/10 rounded-lg border border-accent/50 text-accent hover:bg-accent/20 transition-colors duration-150"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 智能推荐 */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-xs font-heading font-medium text-slate-400 mb-3 uppercase tracking-wide">智能推荐</h3>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 bg-surface/50 border border-border rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-accent">
                  {suggestion.action}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {Math.round(suggestion.confidence * 100)}%
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
                      className="px-1.5 py-0.5 text-xs bg-accent/10 border border-accent/20 rounded text-slate-400"
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
      <div className="p-3 border-t border-border">
        <h3 className="text-xs font-heading font-medium text-slate-400 mb-2 uppercase tracking-wide">证据导出</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onExport?.('pdf')}
            className="flex-1 py-1.5 px-3 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-xs rounded transition-colors duration-150"
          >
            PDF
          </button>
          <button
            onClick={() => onExport?.('markdown')}
            className="flex-1 py-1.5 px-3 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-xs rounded transition-colors duration-150"
          >
            Markdown
          </button>
          <button
            onClick={() => onExport?.('json')}
            className="flex-1 py-1.5 px-3 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-xs rounded transition-colors duration-150"
          >
            JSON
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AIPanel;
