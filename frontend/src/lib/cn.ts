import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 className 的工具函数
 * 使用 clsx 和 tailwind-merge 提供更好的 Tailwind 类名合并体验
 */
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}