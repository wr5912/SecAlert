/**
 * 统计卡片组件 - Tactical Command Center 风格
 */

import { LucideIcon } from 'lucide-react';
import { GlowCard } from '../GlowCard';
import { CornerAccent } from '../CornerAccent';
import { cn } from '../../lib/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, change, changeLabel, icon: Icon, trend = 'neutral' }: StatCardProps) {
  return (
    <GlowCard className="relative overflow-hidden">
      <CornerAccent position="tl-br" className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400 font-heading font-medium tracking-wide uppercase">{title}</p>
            <p className="text-3xl font-bold text-slate-200 mt-2 font-mono">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'text-sm font-medium font-mono',
                    trend === 'up' && 'text-[var(--success)]',
                    trend === 'down' && 'text-[var(--destructive)]',
                    trend === 'neutral' && 'text-slate-500'
                  )}
                >
                  {trend === 'up' && '+'}
                  {trend === 'down' && '-'}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-sm text-slate-500">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
            <Icon className="w-6 h-6 text-accent" />
          </div>
        </div>
      </CornerAccent>
    </GlowCard>
  );
}
