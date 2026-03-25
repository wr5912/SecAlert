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

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-gray-500 text-white',
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
