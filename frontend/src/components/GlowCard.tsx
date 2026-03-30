/**
 * 发光卡片组件
 * 带 glow 效果的卡片容器，critical/high 告警有彩色发光
 */

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export function GlowCard({ children, className = '', severity }: GlowCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg transition-shadow duration-150',
        severity === 'critical' && 'border-severity-critical/50 shadow-glow-critical',
        severity === 'high' && 'border-severity-high/50 shadow-glow-high',
        severity && 'shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}