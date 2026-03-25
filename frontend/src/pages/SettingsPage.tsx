/**
 * 设置页面
 * 用户偏好设置：主题、默认筛选条件、自动刷新等
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Slider from '@radix-ui/react-slider';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { usePreferencesStore } from '../stores/preferencesStore';
import type { Severity } from '../types';

export function SettingsPage() {
  const {
    theme,
    defaultSeverity,
    defaultTab,
    autoRefresh,
    refreshInterval,
    setPreference,
  } = usePreferencesStore();

  // 主题切换效果
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system: 跟随系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  const severityOptions: { value: Severity | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'critical', label: '严重' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 返回链接 */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        返回仪表盘
      </Link>

      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">偏好设置</h1>
        <p className="text-sm text-slate-500 mt-1">自定义您的使用体验</p>
      </div>

      {/* 主题设置 */}
      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
        </CardHeader>
        <CardContent>
          <Select.Root value={theme} onValueChange={(v) => setPreference('theme', v as typeof theme)}>
            <Select.Trigger className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <Select.Viewport className="p-1">
                  {[
                    { value: 'light', label: '浅色' },
                    { value: 'dark', label: '深色' },
                    { value: 'system', label: '跟随系统' },
                  ].map((option) => (
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
        </CardContent>
      </Card>

      {/* 默认筛选设置 */}
      <Card>
        <CardHeader>
          <CardTitle>默认筛选</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 默认严重度 */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">默认严重度</label>
            <Select.Root value={defaultSeverity} onValueChange={(v) => setPreference('defaultSeverity', v as Severity | 'all')}>
              <Select.Trigger className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
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
          </div>

          {/* 默认 Tab */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">默认标签页</label>
            <Select.Root value={defaultTab} onValueChange={(v) => setPreference('defaultTab', v as 'active' | 'suppressed')}>
              <Select.Trigger className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <Select.Value />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <Select.Viewport className="p-1">
                    {[
                      { value: 'active', label: '活跃告警' },
                      { value: 'suppressed', label: '已抑制告警' },
                    ].map((option) => (
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
          </div>
        </CardContent>
      </Card>

      {/* 自动刷新设置 */}
      <Card>
        <CardHeader>
          <CardTitle>自动刷新</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 自动刷新开关 */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">启用自动刷新</label>
            <Checkbox.Root
              checked={autoRefresh}
              onCheckedChange={(checked) => setPreference('autoRefresh', checked === true)}
              className="w-5 h-5 border border-slate-300 rounded data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            >
              <Checkbox.Indicator className="flex items-center justify-center text-white">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Checkbox.Indicator>
            </Checkbox.Root>
          </div>

          {/* 刷新间隔 */}
          {autoRefresh && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-600">刷新间隔</label>
                <span className="text-sm text-slate-900">{refreshInterval} 秒</span>
              </div>
              <Slider.Root
                value={[refreshInterval]}
                onValueChange={([value]) => setPreference('refreshInterval', value)}
                min={30}
                max={300}
                step={30}
                className="relative flex items-center w-full h-5"
              >
                <Slider.Track className="bg-slate-200 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-slate-400">
                <span>30秒</span>
                <span>300秒</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}