import React from 'react';
import type { Severity } from '../../types';

interface BadgeProps {
  severity: Severity;
  children: React.ReactNode;
}

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-gray-500 text-white',
};

export function Badge({ severity, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityStyles[severity]}`}>
      {children}
    </span>
  );
}
