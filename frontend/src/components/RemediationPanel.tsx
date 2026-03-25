/** 处置建议面板组件

Per D-02: 混合内容风格 - 核心行动一行 + 可展开详细说明
显示一行核心建议 + 可展开的详细步骤 + ATT&CK 引用
*/

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { Recommendation } from '../types';

interface RemediationPanelProps {
  recommendation: Recommendation;
}

export function RemediationPanel({ recommendation }: RemediationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const { short_action, detailed_steps, attck_ref, source } = recommendation;

  return (
    <div className="space-y-3">
      {/* 主行：核心行动（加粗） */}
      <div className="text-lg font-semibold text-slate-900">
        {short_action}
      </div>

      {/* 查看详情按钮 */}
      {detailed_steps && detailed_steps.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? '收起详情' : '查看详情'}
        </button>
      )}

      {/* 展开内容 */}
      {expanded && (
        <div className="space-y-3 pl-4 border-l-2 border-slate-200">
          {/* 详细步骤 */}
          {detailed_steps && detailed_steps.length > 0 && (
            <ol className="space-y-1">
              {detailed_steps.map((step, index) => (
                <li key={index} className="text-sm text-slate-700">
                  {step}
                </li>
              ))}
            </ol>
          )}

          {/* ATT&CK 引用（可选显示 per D-04） */}
          {attck_ref && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Info className="w-3 h-3" />
              <span>{attck_ref}</span>
            </div>
          )}

          {/* 来源标记 */}
          <div className="text-xs text-slate-400">
            来源: {source === 'template' ? '模板匹配' : source === 'llm' ? 'AI 生成' : '通用建议'}
          </div>
        </div>
      )}
    </div>
  );
}
