/**
 * HUD 风格角落标记组件
 * 为卡片添加战术风格的角落装饰
 */

import { cn } from '@/lib/utils';

interface CornerAccentProps {
  children: React.ReactNode;
  className?: string;
  position?: 'tl-br' | 'tl' | 'tr' | 'bl' | 'br' | 'all';
  /** 颜色变体 */
  variant?: 'accent' | 'critical' | 'high' | 'medium' | 'low';
  /** 角落线条粗细 */
  weight?: 'thin' | 'normal' | 'thick';
}

const variantBorderColors = {
  accent: 'border-accent',
  critical: 'border-severity-critical',
  high: 'border-severity-high',
  medium: 'border-severity-medium',
  low: 'border-severity-low',
};

const weightSizes = {
  thin: 'w-2 h-2 border',
  normal: 'w-3 h-3 border-[1.5px]',
  thick: 'w-4 h-4 border-2',
};

export function CornerAccent({
  children,
  className = '',
  position = 'tl-br',
  variant = 'accent',
  weight = 'normal'
}: CornerAccentProps) {
  const borderColor = variantBorderColors[variant];
  const sizeClass = weightSizes[weight];

  const renderCorners = () => {
    if (position === 'tl-br') {
      return (
        <>
          <div className={cn('absolute top-0 left-0 rounded-tl-xl', sizeClass, borderColor)} />
          <div className={cn('absolute bottom-0 right-0 rounded-br-xl', sizeClass, borderColor)} />
        </>
      );
    }
    if (position === 'all') {
      return (
        <>
          <div className={cn('absolute top-0 left-0 rounded-tl-xl', sizeClass, borderColor)} />
          <div className={cn('absolute top-0 right-0 rounded-tr-xl', sizeClass, borderColor)} />
          <div className={cn('absolute bottom-0 left-0 rounded-bl-xl', sizeClass, borderColor)} />
          <div className={cn('absolute bottom-0 right-0 rounded-br-xl', sizeClass, borderColor)} />
        </>
      );
    }
    return null;
  };

  return (
    <div className={cn('relative', className)}>
      {renderCorners()}
      {children}
    </div>
  );
}
