import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export function Card({ children, className = '', onClick, severity }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg transition-all duration-150',
        severity === 'critical' && 'border-severity-critical/50 hover:shadow-glow-critical',
        severity === 'high' && 'border-severity-high/50 hover:shadow-glow-high',
        onClick && 'cursor-pointer hover:border-accent/30',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 border-b border-border font-heading', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-200 font-heading', className)}>
      {children}
    </h3>
  );
}
