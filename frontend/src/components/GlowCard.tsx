/**
 * 发光卡片组件
 * 带 glow 效果的卡片容器，critical/high 告警有彩色发光
 */

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  /** 启用 hover 放大效果 */
  scalable?: boolean;
}

export function GlowCard({ children, className = '', severity, scalable = false }: GlowCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl transition-all duration-200',
        // 严重度发光效果
        severity === 'critical' && 'border-severity-critical/40 shadow-[0_0_25px_rgba(255,45,85,0.15)]',
        severity === 'high' && 'border-severity-high/40 shadow-[0_0_25px_rgba(255,107,53,0.15)]',
        severity === 'medium' && 'border-severity-medium/30',
        severity === 'low' && 'border-severity-low/20',
        // 可缩放效果
        scalable && 'hover:scale-[1.02] hover:shadow-lg cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}