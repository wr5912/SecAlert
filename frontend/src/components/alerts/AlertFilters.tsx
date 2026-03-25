/**
 * 告警筛选组件
 * 支持严重度、状态、来源类型、关键词筛选
 * 筛选条件与 URL searchParams 同步
 */

import { Search } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';
import type { Severity } from '../../types';

interface AlertFiltersProps {
  severity: Severity | 'all';
  status: 'active' | 'suppressed' | 'all';
  search: string;
  sourceType: string | 'all';
  onSeverityChange: (severity: Severity | 'all') => void;
  onStatusChange: (status: 'active' | 'suppressed' | 'all') => void;
  onSearchChange: (search: string) => void;
  onSourceTypeChange: (sourceType: string | 'all') => void;
}

const severityOptions: { value: Severity | 'all'; label: string }[] = [
  { value: 'all', label: '全部严重度' },
  { value: 'critical', label: '严重' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const sourceTypeOptions = [
  { value: 'all', label: '全部来源' },
  { value: 'firewall', label: '防火墙' },
  { value: 'ids', label: '入侵检测' },
  { value: 'edr', label: '终端检测' },
  { value: 'waf', label: 'Web应用防火墙' },
];

export function AlertFilters({
  severity,
  status,
  search,
  sourceType,
  onSeverityChange,
  onStatusChange,
  onSearchChange,
  onSourceTypeChange,
}: AlertFiltersProps) {
  return (
    <div className="space-y-4">
      {/* 状态 Tab */}
      <Tabs.Root value={status} onValueChange={(v) => onStatusChange(v as typeof status)}>
        <Tabs.List className="flex gap-4 border-b border-slate-200">
          <Tabs.Trigger
            value="active"
            className={cn(
              'px-1 py-2 border-b-2 text-sm font-medium transition-colors -mb-px',
              status === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            活跃告警
          </Tabs.Trigger>
          <Tabs.Trigger
            value="suppressed"
            className={cn(
              'px-1 py-2 border-b-2 text-sm font-medium transition-colors -mb-px',
              status === 'suppressed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            已抑制告警
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {/* 筛选条件行 */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* 严重度筛选 */}
        <Select.Root value={severity} onValueChange={(v) => onSeverityChange(v as Severity | 'all')}>
          <Select.Trigger className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[140px]">
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <Select.Viewport className="p-1">
                {severityOptions.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* 来源类型筛选 */}
        <Select.Root value={sourceType} onValueChange={(v) => onSourceTypeChange(v as string | 'all')}>
          <Select.Trigger className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[140px]">
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <Select.Viewport className="p-1">
                {sourceTypeOptions.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* 关键词搜索 */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索关键词..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}