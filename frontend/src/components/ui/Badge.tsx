import React from 'react';
import type { Severity } from '../../types';

interface BadgeProps {
  severity: Severity | number;
  children: React.ReactNode;
  /** 启用发光效果 */
  glow?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'default';
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
  critical: 'bg-severity-critical/20 text-severity-critical border-severity-critical/50',
  high: 'bg-severity-high/20 text-severity-high border-severity-high/50',
  medium: 'bg-severity-medium/20 text-severity-medium border-severity-medium/50',
  low: 'bg-severity-low/20 text-severity-low border-severity-low/50',
};

// 发光效果
const glowStyles: Record<Severity, string> = {
  critical: 'shadow-[0_0_8px_rgba(255,45,85,0.3)]',
  high: 'shadow-[0_0_8px_rgba(255,107,53,0.3)]',
  medium: 'shadow-[0_0_8px_rgba(251,191,36,0.2)]',
  low: 'shadow-[0_0_8px_rgba(75,85,99,0.2)]',
};

export function Badge({ severity, children, glow = false, size = 'default' }: BadgeProps) {
  // 处理数字类型的 severity
  const normalizedSeverity: Severity = typeof severity === 'number'
    ? (severityMap[severity] || 'low')
    : severity;

  return (
    <span
      className={`
        inline-flex items-center rounded font-medium transition-all duration-150
        ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}
        ${severityStyles[normalizedSeverity]}
        ${glow ? glowStyles[normalizedSeverity] : ''}
      `}
    >
      {children}
    </span>
  );
}
