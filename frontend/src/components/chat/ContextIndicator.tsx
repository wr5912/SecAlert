/**
 * 上下文指示器
 *
 * 显示当前对话关联的上下文类型和关键信息
 */

import React from 'react';
import { ChatContext } from '../../stores/chatStore';

export function ContextIndicator({ context }: { context: ChatContext }) {
  if (context.type === 'global') {
    return <span className="text-xs text-slate-500">全局上下文</span>;
  }

  const labels: Record<string, string> = {
    chain: '攻击链详情',
    list: '告警列表',
    dashboard: '仪表盘'
  };

  const parts = [labels[context.type] || context.type];

  if (context.chain_id) {
    parts.push(`ID: ${context.chain_id.slice(0, 8)}...`);
  }
  if (context.severity) {
    parts.push(`严重度: ${context.severity}`);
  }

  return (
    <span className="text-xs text-slate-500">
      {parts.join(' · ')}
    </span>
  );
}
