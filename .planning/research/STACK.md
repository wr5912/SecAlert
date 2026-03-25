# Technology Stack: SecAlert v1.1

**项目:** SecAlert v1.1 (多数据源支持 + 产品级 UI + AI 助手)
**研究日期:** 2026-03-25
**研究模式:** Stack Addition Research
**Confidence:** MEDIUM-HIGH (基于 2025-06 训练数据 + 现有架构分析)

---

## Executive Summary

v1.1 需要在 v1.0 已验证的三层解析架构、AI 过滤和攻击链关联基础上，增加：
1. 多设备解析支持 (防火墙/WAF/EDR/云安全)
2. 产品级 React UI (响应式、组件复用)
3. 前端内嵌 AI 助手对话框
4. 报表统计仪表板

**核心原则：** 栈选择必须与现有架构无缝集成，保持私有化离线部署约束。

---

## 1. 多设备解析支持

### 1.1 解析库/框架

| 需求 | 推荐技术 | 版本 | 说明 |
|------|---------|------|------|
| CEF 解析 | `cef-parser` 或自研 | - | CEF 是防火墙/WAF 常用格式，ArcSight 标准 |
| Syslog 解析 | `python-syslog-rfc5424` | 0.4+ | RFC 5424 标准syslog解析 |
| OCSF 规范化 | 自研 + DSPy | - | OCSF 是云原生安全事件标准 |
| JSON 日志 | `json.loads` (stdlib) | - | 多数云安全设备使用 JSON |
| 正则匹配 | `regex` 库 | 2.5+ | 优于标准 re，支持 Unicode |

**为什么不选：** Elastic Common Schema (ECS) 是 Elasticsearch 内部格式，不是解析器；CEFparse 库已停止维护。

### 1.2 设备特定解析器

| 设备类型 | 常见格式 | 推荐方案 |
|----------|----------|----------|
| 防火墙 (Fortinet, Palo Alto, CheckPoint) | CEF/Syslog | 扩展现有三层解析架构 |
| WAF (ModSecurity, AWS WAF, CloudFlare) | JSON/CEF | 添加 JSON 路径提取 |
| EDR (CrowdStrike, SentinelOne, Defender) | JSON/CEF | EDR 通常有标准化的 JSON 输出 |
| 云安全 (AWS Security Hub, Azure Sentinel) | JSON/OCSF | 直接解析 JSON + OCSF 映射 |

### 1.3 向后兼容

**关键约束：** 现有三层解析架构 (模板优先 → Drain 聚类 → LLM 兜底) 必须保留。

```python
# 建议新增解析器注册表
class ParserRegistry:
    """解析器注册表，支持设备类型动态注册"""

    def __init__(self):
        self.parsers: Dict[str, BaseParser] = {}
        self.default_parser = DrainParser()  # 兜底

    def register(self, device_type: str, parser: BaseParser):
        self.parsers[device_type] = parser

    def parse(self, raw_log: str, device_type: Optional[str] = None) -> NormalizedEvent:
        if device_type and device_type in self.parsers:
            return self.parsers[device_type].parse(raw_log)
        # 降级到 Drain + LLM
        return self.default_parser.parse(raw_log)
```

### 1.4 风险与注意事项

- **风险:** 多种设备类型导致解析规则爆炸式增长
- **缓解:** OCSF 作为统一中间格式，减少设备-specific 逻辑
- **验证:** 确保 syslog UDP/TCP 端口配置支持多源

---

## 2. 产品级 React UI

### 2.1 UI 组件库

| 选项 | 推荐度 | 理由 |
|------|--------|------|
| **shadcn/ui + Radix UI** | **首选** | 无供应商锁定，代码可控，Tailwind 原生集成 |
| Chakra UI | 次选 | 上手快但运行时样式冲突风险 |
| Ant Design | 不推荐 | 企业风格固定，不适合 SecAlert 极简原则 |
| Material UI | 不推荐 | Google 设计语言，不适合安全产品 |

**推荐配置:**
```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-select": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

### 2.2 路由

| 选项 | 推荐度 | 理由 |
|------|--------|------|
| **React Router v6** | **首选** | 事实标准，嵌套路由支持 |
| Next.js App Router | 不推荐 | SSR 增加了不必要的复杂度，纯 SPA 足够 |

**推荐配置:**
```json
{
  "dependencies": {
    "react-router-dom": "^6.22.0"
  }
}
```

### 2.3 状态管理

| 需求 | 推荐 | 说明 |
|------|------|------|
| 服务端状态 | **TanStack Query (React Query)** | 数据获取、缓存、轮询一体化 |
| 全局 UI 状态 | **Zustand** | 轻量，比 Redux 简单太多 |
| 表单状态 | **React Hook Form + Zod** | 性能优于 uncontrolled forms |

**为什么不选 Redux:** 对于 SecAlert 的复杂度，Redux 模板代码过多，Zustand 足以应对。

**推荐配置:**
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0"
  }
}
```

### 2.4 响应式设计

**方案:** Tailwind CSS 响应式工具类 (已有 v3.4)

现有 Tailwind 配置已支持响应式，无需额外库。但建议:
- 使用 `container` 插件规范化间距
- 引入 `tailwindcss-typography` 用于长文本展示

```bash
npm install -D @tailwindcss/typography
```

### 2.5 升级清单

| 类别 | 现有 | 升级后 |
|------|------|--------|
| React | 18.2 | 18.2 (保留) |
| Vite | 5 | 5 (保留) |
| Tailwind | 3.4 | 3.4 + typography |
| 路由 | 无 | React Router v6 |
| 状态 | useState | Zustand + TanStack Query |
| 表单 | 无 | React Hook Form + Zod |
| UI 库 | lucide-react (icons) | Radix UI + shadcn/ui 组件 |

---

## 3. AI 助手对话框

### 3.1 前端对话组件

| 选项 | 推荐度 | 理由 |
|------|--------|------|
| **自研 + Radix UI** | **首选** | 完全可控，易于上下文集成 |
| react-chatui | 次选 | 开源但维护不活跃 |
| ChatUI (阿里) | 不推荐 | 面向电商客服，非技术对话 |

**推荐实现:**
```json
{
  "dependencies": {
    "@radix-ui/react-scroll-area": "^1.0.5"
  }
}
```

核心组件结构:
- `AIChatDialog` - 主对话框组件 (Radix Dialog)
- `ChatMessage` - 消息气泡
- `ChatInput` - 输入区域 (支持流式)
- `ContextIndicator` - 上下文关联指示器

### 3.2 流式响应

**后端需求:** FastAPI 支持 SSE (Server-Sent Events)

```python
# 后端新增 endpoint
@router.get("/api/chat/stream")
async def chat_stream(
    message: str,
    context_chain_id: Optional[str] = None
):
    """流式 AI 对话响应"""
    async def generate():
        async for token in ai_service.stream_chat(message, context=context_chain_id):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

**前端流式处理:**
```typescript
// 使用 Fetch API + ReadableStream
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({ message, context_chain_id }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

// 处理流式响应
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // 追加到消息列表
}
```

### 3.3 上下文关联

**设计要点:**
1. 当前查看的攻击链自动作为上下文
2. 用户可以手动切换上下文
3. 上下文变更时，清除对话历史并显示新上下文

```typescript
// 上下文状态
interface ChatContext {
  type: 'chain' | 'alert' | 'dashboard' | 'global';
  entity_id?: string;
  entity_data?: object;
}
```

### 3.4 风险

- **风险:** 流式响应在弱网环境下可能中断
- **缓解:** 前端实现重连逻辑和消息缓存

---

## 4. 报表统计仪表板

### 4.1 图表库

| 选项 | 推荐度 | 理由 |
|------|--------|------|
| **Recharts** | **首选** | React 原生，TypeScript 支持好，轻量 |
| Apache ECharts | 次选 | 功能强大但 React 封装 (echarts-for-react) 不如原生 |
| Tremor | 不推荐 | 虽与 Tailwind 集成好但闭源 (2024 年商业化) |
| Chart.js | 不推荐 | 非 React 原生，需 react-chartjs-2 |

**推荐配置:**
```json
{
  "dependencies": {
    "recharts": "^2.12.0"
  }
}
```

### 4.2 仪表板组件

| 组件 | 推荐技术 | 说明 |
|------|----------|------|
| 趋势折线图 | Recharts LineChart | 告警数量时间趋势 |
| 分布饼图 | Recharts PieChart | 严重度/类型分布 |
| TOP N 柱状图 | Recharts BarChart | TOP 攻击类型/资产 |
| 统计卡片 | 自研 + Tailwind | 关键数字高亮展示 |

### 4.3 数据源

**现有后端 API 已支持:**
- `/api/analysis/metrics/fp-rate` - 误报率统计
- `/api/analysis/metrics/severity-distribution` - 严重度分布
- `/api/chains` - 攻击链列表 (可聚合)

**新增 API 需求:**
```python
# 新增 endpoints for 报表
@router.get("/api/reports/trends")
async def get_alert_trends(
    time_window_days: int = Query(default=7, ge=1, le=90)
) -> Dict[str, Any]:
    """告警趋势 (每日数量)"""

@router.get("/api/reports/top-attack-types")
async def get_top_attack_types(
    limit: int = Query(default=10, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """TOP 攻击类型统计"""

@router.get("/api/reports/affected-assets")
async def get_affected_assets(
    limit: int = Query(default=10, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """受攻击资产统计"""
```

### 4.4 仪表板页面布局

```typescript
// 建议布局
const DashboardLayout = {
  header: { title: '报表统计', timeRangeSelector },
  stats: [
    { label: '总告警', value: total, trend: +5% },
    { label: '真威胁', value: truePositives, trend: -2% },
    { label: '误报率', value: fpRate, trend: -8% },
    { label: '处置率', value: resolutionRate, trend: +3% }
  ],
  charts: [
    { title: '告警趋势', type: 'line', span: 2 },
    { title: '严重度分布', type: 'pie', span: 1 },
    { title: 'TOP 攻击类型', type: 'bar', span: 1 }
  ]
};
```

---

## 5. 完整依赖升级

### 5.1 Frontend (package.json)

```json
{
  "name": "secalert-frontend",
  "version": "1.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-scroll-area": "^1.0.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.27",
    "tailwindcss": "^3.4.19",
    "@tailwindcss/typography": "^0.5.10",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### 5.2 Backend (pyproject.toml)

```toml
[project]
name = "secalert"
version = "1.1.0"

[project.optional-dependencies]
parser = [
    "python-syslog-rfc5424>=0.4",
    "regex>=2.5",
]

[tool.poetry.dependencies]
python = "^3.10"
fastapi = "^0.110.0"
uvicorn = { extras = ["standard"], version = "^0.27.0" }
pydantic = "^2.6.0"
# ... existing dependencies
```

---

## 6. 集成注意事项

### 6.1 与现有架构集成

| 新组件 | 集成点 | 说明 |
|--------|--------|------|
| 多设备解析器 | `src/parser/` | 扩展现有解析注册表 |
| AI Chat | `src/api/chat.py` (新建) | 新增 chat router 注册到 main.py |
| 报表 API | `src/api/reports.py` (新建) | 新增 reports router |

### 6.2 Docker Compose 更新

现有服务无需大幅修改，新增:
- 前端构建产物通过 volume 挂载或单独容器
- 如果添加 Redis Session 用于 AI Chat 上下文，可选添加

---

## 7. 替代方案汇总

| 需求 | 本文推荐 | 替代方案 | 替代理由 |
|------|----------|----------|----------|
| UI 组件库 | shadcn/ui + Radix | Chakra UI | shadcn 无供应商锁定 |
| 路由 | React Router v6 | Next.js | v1.1 不需要 SSR |
| 状态管理 | Zustand + TanStack Query | Redux Toolkit | Zustand 复杂度低 |
| 表单验证 | React Hook Form + Zod | Formik + Yup | Zod 与 TypeScript 更配 |
| 图表 | Recharts | Apache ECharts | Recharts React 原生 |
| AI Chat | 自研 + Radix | react-chatui | 自研更可控 |

---

## 8. Confidence Assessment

| 领域 | Confidence | 说明 |
|------|------------|------|
| UI 组件选择 | MEDIUM-HIGH | shadcn/ui 是 2024-2025 主流选择 |
| 路由/状态 | HIGH | React Router + Zustand 是成熟组合 |
| 图表库 | MEDIUM | Recharts 为主流，但 ECharts 功能更全 |
| AI Chat 实现 | MEDIUM | SSE 流式是标准方式，具体实现待验证 |
| 多设备解析 | MEDIUM | 需要根据实际设备型号验证解析规则 |

---

## 9. Sources

- **shadcn/ui:** https://ui.shadcn.com (官方文档)
- **React Router:** https://reactrouter.com/docs (v6)
- **TanStack Query:** https://tanstack.com/query/latest (官方文档)
- **Recharts:** https://recharts.org (官方文档)
- **CEF Format:** https://www.micro Focus.com/documentation/arcsight/arcsight-smartconnectors/_pdf/CommonEventFormat.pdf
- **OCSF Schema:** https://schema.ocsf.io (官方文档)

**验证状态:** WebSearch 不可用，基于 2025-06 训练数据。**建议在正式选型前验证最新版本和社区状态。**

---

## 10. 下一步

1. **UI 组件原型** - 用 shadcn/ui 搭建基础组件，验证与 Tailwind 的集成
2. **AI Chat 演示** - 实现最小化流式对话，验证 SSE 集成
3. **报表 API** - 扩展 `src/api/analysis.py`，添加趋势统计 endpoints
4. **设备解析验证** - 获取目标防火墙/WAF 的真实日志样本，验证解析覆盖率
