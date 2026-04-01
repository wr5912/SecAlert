import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  /** 启用 hover 效果 */
  interactive?: boolean;
  /** 启用加载动画 */
  loading?: boolean;
}

export function Card({ children, className = '', onClick, severity, interactive = false, loading = false }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl transition-all duration-200',
        // 严重度边框
        severity === 'critical' && 'border-severity-critical/30 shadow-[0_0_15px_rgba(255,45,85,0.1)]',
        severity === 'high' && 'border-severity-high/30 shadow-[0_0_15px_rgba(255,107,53,0.1)]',
        severity === 'medium' && 'border-severity-medium/30',
        severity === 'low' && 'border-severity-low/20',
        // 可点击卡片
        interactive && 'cursor-pointer hover:border-accent/40 hover:bg-surface-hover active:bg-surface-active',
        // 加载状态
        loading && 'animate-pulse',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-5 py-4 border-b border-border/50', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', noPadding = false }: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn('p-5', noPadding && 'p-0', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-base font-semibold text-text-primary font-heading tracking-tight', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-text-muted mt-1', className)}>
      {children}
    </p>
  );
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-4 border-t border-border/50 bg-surface/50', className)}>
      {children}
    </div>
  );
}
