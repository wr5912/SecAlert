import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateEmptyStateProps {
  onCreateClick: () => void;
}

export function TemplateEmptyState({ onCreateClick }: TemplateEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <Database className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-200 mb-2">暂无数据源模板</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-md">
        创建第一个数据源模板，开始接入您的安全设备日志。
      </p>
      <Button onClick={onCreateClick}>
        新建模板
      </Button>
    </div>
  );
}
