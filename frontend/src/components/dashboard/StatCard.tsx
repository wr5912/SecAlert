/**
 * 统计卡片组件
 */

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-200 mt-2">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend === 'up' && 'text-green-400',
                    trend === 'down' && 'text-red-400',
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
          <div className="p-3 bg-cyan-500/10 rounded-lg">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
