# Phase 12: 前端视觉升级 - Research

**研究日期:** 2026-03-30
**领域:** Tailwind CSS 深色主题 + CSS 视觉效果 + 字体加载
**置信度:** MEDIUM-HIGH (基于 Tailwind 3.x 文档和前端最佳实践)

---

## Summary

Phase 12 前端视觉升级需要将现有 UI 改造为 "Tactical Command Center" 美学风格。基于 UI-SPEC 定义的设计系统，需要解决三个核心技术挑战：

1. **Tailwind CSS 深色主题配置** - 通过 CSS 变量和 Tailwind 配置映射实现 UI-SPEC 的完整配色方案
2. **三字体系统加载** - 使用 @fontsource/fontsource-variable 包而非 Google Fonts，优化 FCP
3. **视觉特效实现** - 网格背景、噪点纹理、HUD 角落标记、Glow 效果

**主要建议:** 保持 Tailwind 3.4.x（项目当前版本），通过 CSS 变量实现 UI-SPEC 颜色，使用 @fontsource-variable 包加载字体。

---

## User Constraints (from UI-SPEC)

### Locked Decisions
- 设计方向: "Tactical Command Center" 美学
- 主色: #0a0f1a (背景), #111827 (Surface), #00f0ff (Accent)
- 三字体系统: JetBrains Mono + Space Grotesk + IBM Plex Sans
- shadcn/ui preset: base-nova
- 组件库: @base-ui/react + shadcn

### Out of Scope
- 布局结构调整（已在 Phase 9 实现）
- 功能逻辑变更（纯视觉升级）

---

## Standard Stack

### Core
| 项目 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Tailwind CSS | 3.4.19 (现有) | CSS 框架 | 升级到 4.x 有 breaking changes，建议保持 3.x |
| @fontsource-variable | 5.2.x | 字体加载 | 项目已有 @fontsource-variable/geist |
| tw-animate-css | 1.4.0 (现有) | 动画 | 已在 package.json |
| shadcn | 4.1.0 (现有) | 组件库 | base-nova preset |

### 字体包选择
| 字体 | 推荐包 | 备选 |
|------|--------|------|
| JetBrains Mono | @fontsource-variable/jetbrains-mono | Google Fonts (不推荐) |
| Space Grotesk | @fontsource-variable/space-grotesk | Google Fonts (不推荐) |
| IBM Plex Sans | @fontsource-variable/ibm-plex-sans | Google Fonts (不推荐) |

**为什么不推荐 Google Fonts:**
- 额外的 DNS 解析和连接建立时间
- 在私有化部署环境可能无法访问
- @fontsource 加载更快（内联），适合 SecAlert 离线场景

---

## Architecture Patterns

### 1. Tailwind CSS 变量配置 (darkMode: 'class')

**当前配置:**
```javascript
// tailwind.config.js
export default {
  darkMode: 'class',  // 已在使用
  // ...
}
```

**main.tsx 中的初始化:**
```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.documentElement.classList.add('dark');
}
```

**建议改进方案 - 使用 CSS 变量:**

在 `index.css` 中定义 UI-SPEC 颜色：

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* UI-SPEC 颜色变量 */
  --background: #0a0f1a;
  --surface: #111827;
  --border: #1e293b;
  --accent: #00f0ff;
  --accent-muted: rgba(0, 240, 255, 0.1);

  /* Severity 颜色 */
  --severity-critical: #ff2d55;
  --severity-high: #ff6b35;
  --severity-medium: #fbbf24;
  --severity-low: #4b5563;

  /* Semantic 颜色 */
  --success: #10b981;
  --warning: #f59e0b;
  --destructive: #ff2d55;
  --info: #00f0ff;
}

/* Tailwind 映射 */
@layer base {
  body {
    @apply bg-[var(--background)] text-slate-200 antialiased;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* 确保 dark class 存在时使用深色变量 */
  .dark {
    --background: #0a0f1a;
    --surface: #111827;
    --border: #1e293b;
  }
}
```

**tailwind.config.js 扩展:**
```javascript
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          muted: 'var(--accent-muted)',
        },
        severity: {
          critical: 'var(--severity-critical)',
          high: 'var(--severity-high)',
          medium: 'var(--severity-medium)',
          low: 'var(--severity-low)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-critical': '0 0 20px rgba(255, 45, 85, 0.3)',
        'glow-high': '0 0 20px rgba(255, 107, 53, 0.3)',
      },
    },
  },
}
```

### 2. 字体加载方案

**推荐: @fontsource-variable + Vite 配置**

安装字体包:
```bash
npm install @fontsource-variable/jetbrains-mono @fontsource-variable/space-grotesk @fontsource-variable/ibm-plex-sans
```

在 `main.tsx` 中导入:
```typescript
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/ibm-plex-sans';
```

**font-display 优化:**
@fontsource 默认使用 `font-display: swap`，无需额外配置。

**Vite 预加载关键字体 (可选优化):**
```typescript
// vite.config.ts
export default defineConfig({
  // ...
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          fonts: ['@fontsource-variable/jetbrains-mono', '@fontsource-variable/space-grotesk', '@fontsource-variable/ibm-plex-sans'],
        },
      },
    },
  },
})
```

### 3. 视觉特效实现

#### 3.1 CSS 网格背景 (40px 间距)

```css
/* GridBackground 效果 */
.grid-background {
  background-image:
    linear-gradient(to right, rgba(30, 41, 59, 0.3) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* 或者使用 CSS variables */
.grid-background {
  --grid-color: rgba(30, 41, 59, 0.3);
  --grid-size: 40px;
  background-image:
    linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}
```

**React 组件:**
```tsx
export function GridBackground({ className = '' }: { className?: string }) {
  return <div className={`fixed inset-0 pointer-events-none ${className}`} style={{
    backgroundImage: 'linear-gradient(to right, rgba(30, 41, 59, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  }} />;
}
```

#### 3.2 噪点纹理 (2% 透明度)

```css
/* 噪点纹理 - 使用 SVG filter */
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  z-index: 9999;
}
```

**React 组件:**
```tsx
export function NoiseOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
```

#### 3.3 HUD 风格角落标记

```css
/* HUD 角落标记 */
.corner-accent {
  position: relative;
}

.corner-accent::before,
.corner-accent::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--accent);
  border-style: solid;
}

.corner-accent::before {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
}

.corner-accent::after {
  bottom: -1px;
  right: -1px;
  border-width: 0 2px 2px 0;
}

/* 变体 - 四角都有 */
.corner-accent-all::before,
.corner-accent-all::after,
.corner-accent-all .corner-tr::before,
.corner-accent-all .corner-bl::after {
  /* ... */
}
```

**React 组件:**
```tsx
interface CornerAccentProps {
  children: React.ReactNode;
  className?: string;
  position?: 'all' | 'tl-br' | 'top-left' | 'bottom-right';
}

export function CornerAccent({ children, className = '', position = 'tl-br' }: CornerAccentProps) {
  const positionClasses = {
    'tl-br': 'before:top-0 before:left-0 after:bottom-0 after:right-0',
    'all': 'before:top-0 before:left-0 after:bottom-0 after:right-0 [&_.corner-tr]:before:top-0 [&_.corner-tr]:before:right-0 [&_.corner-bl]:after:bottom-0 [&_.corner-bl]:after:left-0',
  };

  return (
    <div className={`relative ${positionClasses[position]} ${className}`}>
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--accent)]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--accent)]" />
      {position === 'all' && (
        <>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--accent)] corner-tr" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--accent)] corner-bl" />
        </>
      )}
      {children}
    </div>
  );
}
```

#### 3.4 Glow 发光边缘效果

```css
/* Tailwind boxShadow 扩展 */
boxShadow: {
  'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)',
  'glow-critical': '0 0 20px rgba(255, 45, 85, 0.3), 0 0 40px rgba(255, 45, 85, 0.1)',
  'glow-high': '0 0 20px rgba(255, 107, 53, 0.3), 0 0 40px rgba(255, 107, 53, 0.1)',
}

/* GlowCard 组件 */
.glow-card {
  @apply bg-surface border border-border rounded-lg;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
  transition: box-shadow 150ms ease-out;
}

.glow-card:hover {
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.2), 0 0 40px rgba(0, 240, 255, 0.1);
}

.glow-card.critical {
  border-color: var(--severity-critical);
  box-shadow: 0 0 20px rgba(255, 45, 85, 0.2);
}
```

### 4. 动画系统

#### 4.1 交错动画 (Stagger)

```css
/* Tailwind 动画配置 - tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 400ms ease-out forwards',
        'fade-in': 'fadeIn 300ms ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
}
```

**Stagger 工具类:**
```css
/* 交错动画延迟 */
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 50ms; }
.stagger-3 { animation-delay: 100ms; }
.stagger-4 { animation-delay: 150ms; }
.stagger-5 { animation-delay: 200ms; }
.stagger-6 { animation-delay: 250ms; }
.stagger-7 { animation-delay: 300ms; }
.stagger-8 { animation-delay: 350ms; }

/* 或者使用 CSS 自定义属性 */
.stagger {
  animation-fill-mode: both;
}
.stagger-1 { --stagger-delay: 0ms; }
.stagger-2 { --stagger-delay: 50ms; }
.stagger-3 { --stagger-delay: 100ms; }
```

**React 使用示例:**
```tsx
// 页面加载时的列表动画
export function AlertList({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          className="animate-fade-in-up opacity-0"
          style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
        >
          <AlertRow alert={alert} />
        </div>
      ))}
    </div>
  );
}
```

#### 4.2 页面过渡动画

```tsx
// React Router 页面过渡
import { motion, AnimatePresence } from 'framer-motion';
// 或者使用 CSS 类

// CSS 方案 - 在 index.css 中
.page-enter {
  opacity: 0;
  transform: translateY(10px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
```

#### 4.3 Skeleton 加载动画

```css
/* Skeleton pulse 动画 - tw-animate-css 已提供 */
.skeleton {
  @apply bg-muted rounded animate-pulse;
}

/* 自定义 skeleton 样式 */
.skeleton-gradient {
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0.3) 0%,
    rgba(30, 41, 59, 0.6) 50%,
    rgba(30, 41, 59, 0.3) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 5. 组件改造策略

#### 5.1 优先级排序

| 优先级 | 组件 | 改造内容 | 工作量 |
|--------|------|----------|--------|
| P0 | index.css / tailwind.config | 全局变量、颜色、字体 | 低 |
| P0 | StatCard | 新增 GlowCard 样式、CornerAccent | 低 |
| P0 | AlertBadge | 升级 severity 颜色映射 | 低 |
| P1 | Card | 新增 GlowCard variant、CSS 变量化 | 中 |
| P1 | AlertRow | 新增 hover 效果、交错动画 | 低 |
| P1 | Button | 适配新配色、focus ring | 低 |
| P2 | Input / Select | 新配色、focus ring | 低 |
| P2 | Header | Logo + Nav 样式微调 | 低 |
| P2 | Dialog / Tooltip | 样式适配 | 中 |
| P3 | Charts (Recharts) | 配色主题适配 | 中 |
| P3 | AI Copilot Panel | Accent 边框、glow 效果 | 中 |

#### 5.2 新增组件

| 组件 | 用途 | 实现难度 |
|------|------|----------|
| GridBackground | 页面网格背景 | 低 |
| NoiseOverlay | 噪点纹理层 | 低 |
| GlowCard | 带 glow 的卡片容器 | 低 |
| CornerAccent | HUD 角落标记 | 低 |
| StatusIndicator | 脉冲状态指示器 | 低 |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| 字体加载 | Google Fonts @import | @fontsource-variable 包 |
| 噪点纹理 | canvas 动态生成 | CSS SVG filter (data URI) |
| 动画抖动 | JS setTimeout | CSS animation-delay |
| 深色主题检测 | 手动 media query | Tailwind darkMode: 'class' |

---

## Common Pitfalls

### Pitfall 1: Tailwind 4.x Breaking Changes
**问题:** Tailwind CSS 4.0 有重大架构变化（基于 Rust 的 Lightning CSS）
**影响:** 直接升级可能导致配置不兼容
**预防:** 保持 Tailwind 3.4.x，或使用 codemod 工具转换
**验证:** 升级后运行 `npm run build` 确保无错误

### Pitfall 2: CSS 变量优先级冲突
**问题:** shadcn/ui 的 CSS 变量可能与自定义变量冲突
**症状:** 颜色不生效或闪烁
**预防:** 使用 `@layer base` 确保基础样式优先级
**验证:** 检查 DevTools 中 computed styles

### Pitfall 3: 字体 FOUT (Flash of Unstyled Text)
**问题:** 字体加载延迟导致文字闪烁
**预防:** 使用 @fontsource 的 `font-display: swap` + `<link rel="preconnect">`
**优化:** 预加载关键字体
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### Pitfall 4: 动画性能问题
**问题:** 过多动画导致滚动卡顿
**预防:**
- 使用 `transform` 和 `opacity` 而非 `top/left`
- 避免动画 `border`, `box-shadow`
- 使用 `will-change: transform` 但仅在需要时

### Pitfall 5: Grid 背景性能
**问题:** 透明背景 + CSS 网格可能导致重绘
**预防:** 使用 `pointer-events: none` 确保不影响交互
**优化:** 使用 `background-attachment: fixed`（但移动端不友好）

---

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|------------------|--------------|
| Tailwind 2.x | Tailwind 3.x (3.4.x) | 2022 |
| CSS @import Google Fonts | @fontsource/fontsource-variable | 2023 |
| CSS-in-JS | Tailwind CSS + @apply | 2020 |
| Framer Motion (复杂动画) | tw-animate-css + CSS | 2024 |

---

## Performance Considerations

### OLED 省电
- 深色主题对 OLED 屏幕可节省 30-50% 电量
- 纯黑 (#000000) 最省电，但 UI-SPEC 使用 #0a0f1a（接近黑）

### 字体加载优化
- @fontsource-variable 包比 Google Fonts 快 200-400ms（无外部请求）
- 适合 SecAlert 私有化离线部署

### 动画性能优化
```css
/* Good: 使用 transform */
.animate-slide {
  transform: translateX(var(--offset));
  transition: transform 200ms ease-out;
}

/* Avoid: 避免触发布局的属性 */
.animate-slide {
  left: var(--offset);  /* BAD: 触发 layout */
  transition: left 200ms ease-out;
}
```

### will-change 使用指南
```css
/* 明确知道要动画的元素 */
.animate-card {
  will-change: transform, opacity;
}

/* 动画完成后移除 */
.animate-card.static {
  will-change: auto;
}
```

---

## Open Questions

1. **Tailwind 4.x 迁移时机**
   - 当前项目使用 3.4.19，Phase 12 后是否需要升级到 4.x？
   - 建议: Phase 12 保持 3.x，Phase 13+ 考虑升级

2. **shadcn/ui base-nova 颜色变量**
   - 需要确认 shadcn base-nova preset 的 CSS 变量命名
   - 建议: 检查 shadcn 生成的 globals.css 或查看 shadcn 文档

3. **Recharts 主题适配**
   - Recharts 使用自己的主题系统，需要单独配置
   - 建议: 使用 Recharts 的 `theme` prop 或自定义 `<defs>`

---

## Environment Availability

**Step 2.6: SKIPPED (no external dependencies identified)**

Phase 12 是纯前端视觉升级，无外部工具依赖：
- Node.js / npm: 已有（前端开发环境）
- Tailwind CSS: 已有（3.4.19）
- shadcn: 已有（4.1.0）

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | vite.config.ts (已有) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Command |
|--------|----------|-----------|---------|
| UI-12-01 | 全局 CSS 变量正确应用 | Visual/E2E | 手动验证 |
| UI-12-02 | 三字体正确加载 | Visual/E2E | 手动验证 |
| UI-12-03 | GridBackground 渲染 | Visual | 手动验证 |
| UI-12-04 | Glow 效果渲染 | Visual | 手动验证 |
| UI-12-05 | 交错动画流畅 | Visual | 手动验证 |

### Wave 0 Gaps
- [ ] `tests/components/GridBackground.test.tsx` - GridBackground 渲染测试
- [ ] `tests/components/GlowCard.test.tsx` - GlowCard 效果测试
- [ ] `tests/components/CornerAccent.test.tsx` - HUD 角落标记测试
- [ ] Framework install: Vitest (`npm install -D vitest @testing-library/react @testing-library/jest-dom`)

---

## Sources

### Primary (HIGH confidence)
- Tailwind CSS 3.4 Documentation - dark mode, CSS variables, configuration
- shadcn/ui base-nova preset - components.json 验证
- @fontsource/fontsource-variable - npm 包的 font-display 行为

### Secondary (MEDIUM confidence)
- CSS-Tricks: "CSS Grid Background Patterns" - 网格背景实现
- MDN: "CSS animations" - 交错动画最佳实践
- Google Fonts performance study - @fontsource 性能优势

### Tertiary (LOW confidence)
- Tailwind 4.0 speculation - 基于 release notes 和 blog posts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 基于现有项目配置和稳定版本
- Architecture: HIGH - 成熟方案，无新技术风险
- Pitfalls: MEDIUM - 基于前端常见问题，需要实际验证

**研究日期:** 2026-03-30
**有效期:** 60 days (技术栈稳定)
