import React from 'react';
import type { Severity } from '../../types';

interface BadgeProps {
  severity: Severity | number;
  children: React.ReactNode;
}

// 数字到字符串的映射
const severityMap: Record<number, Severity> = {
  4: 'critical',
  3: 'high',
  2: 'medium',
  1: 'low',
};

// UI-SPEC 霓虹风格 severity 颜色
const severityStyles: Record<Severity, string> = {
  critical: 'bg-[var(--severity-critical)]/20 text-[var(--severity-critical)] border border-[var(--severity-critical)]/50',
  high: 'bg-[var(--severity-high)]/20 text-[var(--severity-high)] border border-[var(--severity-high)]/50',
  medium: 'bg-[var(--severity-medium)]/20 text-[var(--severity-medium)] border border-[var(--severity-medium)]/50',
  low: 'bg-[var(--severity-low)]/20 text-[var(--severity-low)] border border-[var(--severity-low)]/50',
};

export function Badge({ severity, children }: BadgeProps) {
  // 处理数字类型的 severity
  const normalizedSeverity: Severity = typeof severity === 'number'
    ? (severityMap[severity] || 'low')
    : severity;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityStyles[normalizedSeverity]}`}>
      {children}
    </span>
  );
}
