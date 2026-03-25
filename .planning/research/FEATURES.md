# Feature Landscape: v1.1 多数据源支持 + 产品级 UI + AI 助手

**Domain:** 安全告警分析平台
**Researched:** 2026-03-25
**Confidence:** MEDIUM（基于现有系统分析，外部搜索工具受限）

---

## 概述

v1.1 在 v1.0 单设备（Suricata IDS）基础上，新增多设备支持、产品级前端、AI 助手对话和报表统计四个能力域。

---

## 1. 多数据源支持（Multi-Device Log Parsing）

### 1.1 目标设备类型

| 设备类型 | 示例产品 | 日志格式 | OCSF Source Type |
|----------|----------|----------|------------------|
| **防火墙** | Palo Alto, Fortinet, Cisco ASA | Syslog/CEF, JSON | `firewall` |
| **WAF** | ModSecurity, Imperva, AWS WAF | JSON, Apache/Nginx 格式 | `waf` |
| **EDR** | CrowdStrike, SentinelOne, DeepInstinct | JSON, XML | `endpoint` |
| **IDS/IPS** | Suricata (已有), Snort, Zeek | EVE JSON (已有), JSON | `ids`/`ips` |
| **云安全** | AWS CloudTrail, Azure Security Center | JSON | `cloud` |
| **邮件安全** | Proofpoint, IronPort | JSON, Syslog | `email_security` |
| **身份安全** | Azure AD, Okta | SAML, JSON | `identity` |

### 1.2 表干功能（Table Stakes）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 模板注册中心扩展 | 支持新设备只需添加 YAML 模板 | Low | 复用现有 `TemplateRegistry`，新增 `source_type` 字段 |
| OCSF 标准化映射 | 所有设备日志统一转为 OCSF 格式 | Medium | 已有 `ocsf_mapper.py`，需扩展覆盖更多字段 |
| 多源事件关联 | 同源攻击链可能来自不同设备 | High | 需要统一的 `source_name` + `source_type` 标识 |
| 设备发现/配置 | 用户声明式配置数据源 | Low | 简单 YAML/表单配置即可 |

### 1.3 差异化功能（Differentiators）

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 零样本模板生成 | 新设备无需预置模板，DSPy 自动推断 | High | 使用 LLM 分析样本日志生成初始模板 |
| 跨设备攻击链 | 从防火墙+WAF+EDR 关联完整攻击路径 | High | 需要统一实体（IP、MAC、用户名）在多源间链接 |
| 设备健康监控 | 检测某设备日志中断/异常 | Medium | 统计各源告警数量，异常时告警 |

### 1.4 依赖现有系统

```
parser/registry.py     → TemplateRegistry 支持多 source_type
parser/pipeline.py      → ThreeTierParser.parse(source_type) 已支持
storage/ocsf_mapper.py → 已有 OCSF 映射，需扩展字段覆盖
parser/templates/      → 新设备添加 YAML 模板即可
```

### 1.5 架构扩展点

**模板扩展示例 - Palo Alto Firewall:**
```yaml
source_type: paloalto_firewall
templates:
  - name: paloalto_traffic
    match:
      log_type: traffic
    fields:
      timestamp: {path: "start_time", type: string}
      src_ip: {path: "srcaddr", type: ip}
      src_port: {path: "srcport", type: integer}
      dest_ip: {path: "dstaddr", type: ip}
      dest_port: {path: "dstport", type: integer}
      action: {path: "action", type: string}
      rule: {path: "rule", type: string}
```

---

## 2. 产品级 Web UI（Production React UI）

### 2.1 表干功能（Table Stakes）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 响应式布局 | 运维可能从手机/平板查看 | Low | Tailwind CSS 已有，移动端适配 |
| 加载状态 | 网络请求必须有视觉反馈 | Low | 已有 "加载中..." 文本，需升级为骨架屏/spinner |
| 错误边界 | API 失败时不能白屏 | Medium | React Error Boundary 组件 |
| 离线/网络恢复 | 弱网络环境需优雅降级 | Medium | TanStack Query 已有 retry 机制 |
| 表单验证 | 用户输入必须校验 | Low | 简单 zod/react-hook-form |

### 2.2 差异化功能（Differentiators）

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 实时告警推送 | 不用刷新页面，新告警自动出现 | High | WebSocket 或 SSE，推送至前端 |
| 虚拟滚动 | 告警列表万级数据不卡 | Medium | @tanstack/react-virtual |
| 键盘快捷键 | 提升运维效率 | Low | `j/k` 上下导航，`Enter` 查看详情 |
| 主题切换 | 深色模式减少夜班眼睛疲劳 | Low | Tailwind dark mode |
| 操作批处理 | 批量确认/抑制告警 | Medium | Shift+点击多选 |

### 2.3 推荐依赖

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@tanstack/react-query` | v5 | 服务端状态管理 | 缓存、loading、error、refetch 全支持 |
| `react-hook-form` | v7 | 表单管理 | 减少 re-render，built-in validation |
| `zod` | - | Schema 验证 | 与 TypeScript 一体化 |
| `@tanstack/react-virtual` | v3 | 虚拟列表 | 大数据集性能优化 |
| `sonner` | - | Toast 通知 | 操作反馈（确认成功/失败） |

### 2.4 现有系统评估

| 已有实现 | 现状 | 需改进 |
|----------|------|--------|
| AlertList loading 状态 | 简单文本 "加载中..." | 升级为骨架屏 |
| Error handling | try/catch + 显示 error | 需 Error Boundary |
| API client | 基础 fetch 封装 | 缺少 request cancellation, retry |
| 响应式 | Tailwind 已有 | 可微调 |

### 2.5 模式示例

**Error Boundary 组件:**
```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500">页面出错，请刷新</div>;
    }
    return this.props.children;
  }
}
```

**TanStack Query 集成:**
```tsx
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['chains', severity],
  queryFn: () => fetchChains(50, 0, severity),
  staleTime: 30000,      // 30秒内不重新请求
  retry: 3,              // 失败重试3次
  refetchInterval: 60000 // 每分钟自动刷新
});
```

---

## 3. AI 助手对话框（AI Chat Assistant）

### 3.1 表干功能（Table Stakes）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 多轮对话 | 运维可能追问"这条告警的来源IP是哪里？" | Low | 维护 messages 数组 |
| 上下文注入 | AI 需知道当前在看哪个告警/攻击链 | Medium | system prompt 包含当前页面状态 |
| 流式输出 | 打字机效果体验好 | Low | fetch + ReadableStream |
| 消息类型区分 | 用户消息 vs AI 回复 vs 系统提示 | Low | 不同样式/头像 |
| 对话历史 | 同一会话内上下文连续 | Low | messages state 持久化 |

### 3.2 差异化功能（Differentiators）

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 页面感知注入 | "帮我分析这个告警" 自动注入当前告警详情 | Medium | 当前页面 state → system prompt |
| 结构化输出 | AI 回复包含可点击的 IP、哈希等实体 | High | 需要流式解析 + 高亮渲染 |
| 告警处置执行 | "把这个标记为误报" → 调用 API | High | 需要 function calling / tool use |
| 对话搜索 | 历史对话中找类似问题 | Medium | 存储对话记录，支持检索 |
| 快捷指令 | `/help` `/analyze` `/suppress` | Low | slash commands 模式 |

### 3.3 上下文关联设计

**页面状态 → System Prompt 注入:**

```typescript
interface PageContext {
  page: 'list' | 'detail' | 'dashboard';
  currentAlert?: AttackChain;
  filters?: { severity?: Severity; status?: string; };
};

// 页面切换时更新 context
function updateChatContext(context: PageContext) {
  const systemMessage = {
    role: 'system',
    content: `当前用户正在查看 SecAlert 安全告警平台。
页面: ${context.page}
${context.currentAlert ? `
当前告警:
- 攻击链ID: ${context.currentAlert.chain_id}
- 严重度: ${context.currentAlert.max_severity}
- 源IP: ${context.currentAlert.src_ip}
- 目标资产: ${context.currentAlert.asset_ip}
- 告警数量: ${context.currentAlert.alert_count}
- 状态: ${context.currentAlert.status}
` : ''}
你是安全分析师助手，帮助运维人员理解和处置安全告警。`
  };
  // 添加到 messages
}
```

### 3.4 依赖现有系统

```
src/api/           → 后端 API（需新增 /api/chat 端点）
src/analysis/     → DSPy 程序（复用人机协作分析逻辑）
src/graph/client  → Neo4j（查询告警上下文）
```

### 3.5 后端 API 设计建议

```python
# POST /api/chat
{
  "messages": [
    {"role": "user", "content": "这条告警怎么处理？"}
  ],
  "context": {
    "chain_id": "abc123",
    "page": "detail"
  }
}

# Response: SSE stream
data: {"role": "assistant", "content": "根据告警"}
data: {"role": "assistant", "content": "分析，"}
...
data: {"done": true}
```

---

## 4. 报表统计仪表板（Security Reporting Dashboard）

### 4.1 表干功能（Table Stakes）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 告警趋势图 | 每天告警量变化，识别异常 | Low | Line chart (7天/30天) |
| 严重度分布 | 当前积压的告警分布 | Low | Donut/Pie chart |
| TOP 攻击类型 | 哪些攻击最常见 | Low | Horizontal bar chart |
| 处置统计 | 已处理/待处理比例 | Low | Simple metric + progress |
| 时间范围选择 | 可切换 24h/7d/30d/自定义 | Low | Date picker |

### 4.2 差异化功能（Differentiators）

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 误报率趋势 | 展示系统准确性提升 | Medium | Line chart + 目标线 |
| 资产受损报告 | 哪些资产被攻击最多 | Medium | 按资产聚合 |
| 响应时效统计 | 平均处置时间 SLA | Medium | 从 acknowledged_at 计算 |
| 报表导出 | PDF/CSV 导出给领导 | High | 服务端生成 or 前端 html2pdf |
| 环比/同比 | 与上周/月对比 | Low | 简单计算百分比 |

### 4.3 已有系统评估

| 已有实现 | 现状 | 需改进 |
|----------|------|--------|
| `src/analysis/metrics.py` | FalsePositiveMetricsCollector 存在 | 需扩展为完整指标体系 |
| 严重度分布 | 简化版 get_severity_distribution() | 需支持时间范围 |
| 误报统计 | 基础 fp_rate 计算 | 需趋势数据（非单点） |

### 4.4 指标体系设计

```typescript
interface DashboardMetrics {
  // 时间范围
  timeRange: { start: Date; end: Date };

  // 告警统计
  alertStats: {
    total: number;
    bySeverity: { critical: number; high: number; medium: number; low: number; };
    byStatus: { active: number; resolved: number; falsePositive: number; };
  };

  // 趋势数据（每日聚合）
  trends: Array<{
    date: string;
    total: number;
    truePositives: number;
    falsePositives: number;
  }>;

  // TOP 统计
  topAttackTypes: Array<{ signature: string; count: number; }>;
  topAffectedAssets: Array<{ asset_ip: string; count: number; }>;

  // 效能指标
  performance: {
    avgResolutionTimeHours: number;
    falsePositiveRate: number;  // 百分比
    suppressionRate: number;     // 自动抑制率
  };
}
```

### 4.5 图表库选择

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| Recharts | React 原生，轻量，易用 | 功能相对基础 | **推荐**（适合简单图表） |
| Tremor | 内置 UI 组件，仪表板友好 | 学习曲线 | 备选 |
| Chart.js | 功能强大 | React 封装不完美 | 不推荐 |

### 4.6 API 端点设计

```
GET /api/metrics/dashboard
    ?range=7d|30d|custom
    &start=2026-03-01
    &end=2026-03-25

Response: DashboardMetrics
```

---

## 5. 功能依赖关系

```
                    ┌─────────────────────┐
                    │   Multi-Device      │
                    │   Log Parsing       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
┌──────────────────┐  ┌───────────────┐  ┌───────────────┐
│  AI Chat Context │  │  Dashboard    │  │  Alert List   │
│  (需要攻击链数据)  │  │  (需要指标)    │  │  (已有基础)    │
└──────────────────┘  └───────────────┘  └───────────────┘
         │                   │                  │
         └───────────────────┴──────────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │   产品级 Web UI     │
                    │   (基础框架)        │
                    └─────────────────────┘
```

---

## 6. MVP 推荐

### Phase 1: 多数据源基础
1. 扩展 TemplateRegistry 支持新设备类型
2. 添加 2-3 个常见设备模板（Palo Alto, ModSecurity）
3. 完善 OCSF 字段映射覆盖

### Phase 2: UI 基础 + 报表
1. 引入 TanStack Query
2. 添加 Error Boundary
3. 骨架屏加载状态
4. 基础 Dashboard（趋势 + 分布）

### Phase 3: AI 助手基础
1. 基础对话 UI（消息列表 + 输入框）
2. 页面上下文注入
3. 流式输出
4. /api/chat 后端端点

### Phase 4: 高级功能
1. 实时告警推送（WebSocket）
2. AI 处置执行（function calling）
3. 报表导出
4. 虚拟滚动

---

## 7. 关键技术风险

| Feature | Risk | Mitigation |
|---------|------|------------|
| 多设备关联 | 不同设备时间不同步 | 统一使用统一时间戳（UTC）+ 窗口容差 |
| 零样本模板 | LLM 生成可能不准确 | 保留人工确认环节，生成后用户可修正 |
| AI 助手幻觉 | LLM 可能编造告警细节 | 注入真实数据到 prompt，限制只读操作 |
| 实时推送 | WebSocket 复杂度 | 考虑 SSE（更简单）或轮询（可接受） |
| 大数据量 Dashboard | ES 聚合查询慢 | 预计算 + 缓存，ClickHouse 加速 |

---

## 8. 参考来源

| 领域 | 来源 | 置信度 |
|------|------|--------|
| OCSF 标准化 | OCSF Schema GitHub (ocsf/ocsf-schema) | HIGH |
| 多设备日志格式 | 各厂商公开文档（Palo Alto, Fortinet, AWS） | HIGH |
| React 生产模式 | React 官方文档 + TanStack Query 文档 | HIGH |
| 安全仪表板指标 | 行业标准 SOC 指标（MITRE ATT&CK） | MEDIUM |
| AI 对话上下文 | LangChain/GPTs 最佳实践 | MEDIUM |

**注意:** 由于外部搜索工具受限，部分分析基于现有系统代码逆向工程和领域知识推断，建议后续通过用户访谈确认具体需求。
