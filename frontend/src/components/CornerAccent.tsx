/**
 * HUD 风格角落标记组件
 * 为卡片添加战术风格的角落装饰
 */

import { cn } from '@/lib/utils';

interface CornerAccentProps {
  children: React.ReactNode;
  className?: string;
  position?: 'tl-br' | 'all';
}

export function CornerAccent({ children, className = '', position = 'tl-br' }: CornerAccentProps) {
  return (
    <div className={cn('relative', className)}>
      {position === 'tl-br' && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent" />
        </>
      )}
      {position === 'all' && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent" />
        </>
      )}
      {children}
    </div>
  );
}