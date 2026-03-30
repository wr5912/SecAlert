/**
 * 网格背景组件
 * 页面背景网格效果，40px 间距线条
 */

export function GridBackground({ className = '' }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(30, 41, 59, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
  );
}