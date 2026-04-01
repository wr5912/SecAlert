/**
 * 统计卡片组件 - Tactical Command Center 风格
 */

import { LucideIcon } from 'lucide-react';
import { GlowCard } from '../GlowCard';
import { CornerAccent } from '../CornerAccent';
import { cn } from '../../lib/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  /** 严重度 */
  severity?: 'default' | 'critical' | 'high' | 'medium' | 'low';
}

export function StatCard({ title, value, change, changeLabel, icon: Icon, trend = 'neutral', severity = 'default' }: StatCardProps) {
  return (
    <GlowCard className="relative overflow-hidden group" severity={severity === 'default' ? undefined : severity}>
      <CornerAccent position="tl-br" variant={severity === 'default' ? 'accent' : severity}>
        <div className="flex items-start justify-between p-5">
          <div className="flex-1">
            {/* 标题 */}
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</p>

            {/* 数值 */}
            <p className="text-3xl font-bold text-text-primary mt-2 font-mono tracking-tight">
              {value}
            </p>

            {/* 趋势信息 */}
            {change !== undefined && (
              <div className="flex items-center gap-2 mt-3">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                  trend === 'up' && 'bg-success-bg text-success',
                  trend === 'down' && 'bg-destructive-bg text-destructive',
                  trend === 'neutral' && 'bg-surface-hover text-text-muted'
                )}>
                  {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                  {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                  {trend === 'neutral' && <Minus className="w-3 h-3" />}
                  <span>{trend === 'up' ? '+' : trend === 'down' ? '' : ''}{change}%</span>
                </div>
                {changeLabel && (
                  <span className="text-xs text-text-muted">{changeLabel}</span>
                )}
              </div>
            )}
          </div>

          {/* 图标区域 */}
          <div className={cn(
            "p-3 rounded-xl border transition-all duration-200",
            severity === 'critical' && 'bg-severity-critical-bg border-severity-critical/30 group-hover:border-severity-critical/50',
            severity === 'high' && 'bg-severity-high-bg border-severity-high/30 group-hover:border-severity-high/50',
            severity === 'medium' && 'bg-severity-medium-bg border-severity-medium/30 group-hover:border-severity-medium/50',
            severity === 'low' && 'bg-surface-hover border-border group-hover:border-border-hover',
            severity === 'default' && 'bg-accent/10 border-accent/20 group-hover:bg-accent/15 group-hover:border-accent/30'
          )}>
            <Icon className="w-6 h-6 text-accent" />
          </div>
        </div>
      </CornerAccent>
    </GlowCard>
  );
}
