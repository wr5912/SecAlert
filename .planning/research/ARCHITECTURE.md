# ARCHITECTURE.md - v1.1 新功能架构研究

**项目:** SecAlert v1.1 多数据源支持 + 产品级 UI + AI 助手
**研究日期:** 2026-03-25
**研究类型:** 项目架构 - v1.1 新功能集成
**置信度:** MEDIUM (基于现有项目架构理解和标准模式推断)

---

## Executive Summary

v1.1 在 v1.0 已验证的三层解析架构 (模板 → Drain → DSPy/LLM) 基础上，扩展四个新能力域：**多数据源解析增强**、**产品级 Web UI**、**AI 助手对话**、**报表统计仪表板**。本文档分析各新功能与现有架构的集成点，识别数据流变更、组件边界变化、以及跨功能依赖关系。

**关键结论:**
- 多数据源解析：在现有 Parser Layer 扩展，通过 Parser Registry 实现模板版本化管理
- AI 助手：新增 MCP Server 作为 AI Agent 接口层，前端通过 Server-Sent Events (SSE) 通信
- 报表仪表板：基于 Elasticsearch Aggregations，ClickHouse 作为未来规模化备选
- UI 架构：从单页 List/Detail 切换演进为多视图布局，引入状态管理模式

---

## 1. 现有架构回顾

### 1.1 当前组件拓扑

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  React/TypeScript Frontend (Port 5173)                         │   │
│  │  - AlertList (列表视图)  - AlertDetail (详情视图)               │   │
│  │  - RemediationPanel (处置建议)  - ChainTimeline (攻击链)        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              │ REST API (port 8000)
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                            API SERVICE LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI Backend                                                │   │
│  │  - /api/chains (告警链 CRUD)                                     │   │
│  │  - /api/remediation/* (处置工作流)                              │   │
│  │  - PostgreSQL (元数据)  Redis (缓存/队列)                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Elasticsearch│  │ ClickHouse │  │   Neo4j    │  │   MinIO    │       │
│  │  全文检索   │  │  聚合分析   │  │  实体关系  │  │  原始日志  │       │
│  │  8.11.0   │  │  (已配置)   │  │  攻击链    │  │  归档存储  │       │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                         STREAM PROCESSING LAYER                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Kafka (raw-events topic) → Flink 流处理                        │   │
│  │  三层解析: 模板匹配 → Drain聚类 → DSPy/Qwen3-32B LLM            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                          COLLECTION LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Vector (统一采集)  -  Syslog (514)  -  JDBC  -  Webhook        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 v1.0 数据流

```
[异构安全设备] → Vector → Kafka (raw-events) → Flink Parser
                                                       │
                                                       ↓
                              ┌────────────────────────────────────────┐
                              │         三层解析引擎                    │
                              │  ┌──────────────────────────────────┐  │
                              │  │ 第一层: 预置模板匹配 (50+ 主流设备) │  │
                              │  └──────────────┬───────────────────┘  │
                              │                 ↓ 未命中                 │
                              │  ┌──────────────────────────────────┐  │
                              │  │ 第二层: Drain 聚类 (100万行/秒)   │  │
                              │  └──────────────┬───────────────────┘  │
                              │                 ↓ 无法解析              │
                              │  ┌──────────────────────────────────┐  │
                              │  │ 第三层: DSPy + Qwen3-32B        │  │
                              │  └──────────────┬───────────────────┘  │
                              └─────────────────┼──────────────────────┘
                                                ↓
                              ┌────────────────────────────────────────┐
                              │              输出路径                     │
                              │  ES (索引)  ←→  Neo4j (图)  ←→  MinIO  │
                              └────────────────────────────────────────┘
```

---

## 2. 集成点分析

### 2.1 多数据源解析 (Multi-Device Parsing)

**目标:** 扩展三层解析架构，支持更多设备类型（防火墙、WAF、EDR、云安全）

#### 2.1.1 集成点识别

| 组件 | v1.0 状态 | v1.1 变更 | 变更类型 |
|------|----------|----------|---------|
| **Parser Registry** | 不存在 | 新增 ParserRegistry 类 | NEW |
| **模板存储** | 硬编码 50+ 模板 | YAML 文件存储 + 动态加载 | MODIFY |
| **Drain Algorithm** | 单实例运行 | 支持并行实例池 | MODIFY |
| **DSPy Parser** | LogParserSignature | 新增格式推断 Signature | MODIFY |
| **Vector Config** | 静态配置 | 支持运行时配置变更 | MODIFY |

#### 2.1.2 数据流扩展

```
v1.0 数据流:
[设备日志] → Vector → Kafka → Flink → ES/Neo4j

v1.1 数据流:
[设备日志] → Vector → Kafka → Flink
                                   │
                                   ├──→ [Parser Registry] ──→ 模板匹配
                                   │         │
                                   │         ↓ 未命中
                                   │    [Drain Cluster Pool]
                                   │         │
                                   │         ↓ 无法解析
                                   │    [DSPy Format Inference]
                                   │         │
                                   └──→ [原始日志] → MinIO 归档
```

#### 2.1.3 Parser Registry 设计

```python
# parser_registry.py
class ParserRegistry:
    """解析器注册表 - 管理设备模板版本"""

    def __init__(self):
        self._templates: Dict[str, ParserTemplate] = {}
        self._drain_clusters: Dict[str, DrainCluster] = {}

    def register_template(self, device_type: str, template: ParserTemplate):
        """注册新设备模板"""
        self._templates[device_type] = template

    def match_template(self, raw_log: str) -> Optional[ParserTemplate]:
        """第一层: 模板匹配"""
        for template in self._templates.values():
            if template.matches(raw_log):
                return template
        return None

    def get_drain_cluster(self, log_hash: str) -> Optional[DrainCluster]:
        """第二层: Drain 聚类查询"""
        return self._drain_clusters.get(log_hash)

    def infer_format(self, raw_log: str) -> ParsedEvent:
        """第三层: DSPy LLM 格式推断"""
        # 调用 LogParserSignature
        ...
```

#### 2.1.4 新增组件 vs 修改组件

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| ParserRegistry | NEW | 模板版本管理、解析器调度 | 被 Flink 调用 |
| TemplateLoader | NEW | YAML 模板动态加载 | 依赖 ParserRegistry |
| DrainClusterPool | NEW | Drain 聚类实例池 | 依赖现有 Drain 实现 |
| FormatInferSignature | MODIFY | 扩展 LogParserSignature | 依赖 DSPy |
| VectorConfigHotReload | MODIFY | 支持运行时配置 | 依赖 Vector |

#### 2.1.5 模板扩展工作流

```
1. 新设备接入:
   用户上传设备日志样本 → 系统自动格式推断 → 生成模板草稿
   → 用户确认字段映射 → 模板版本化 → 加入 ParserRegistry

2. 模板版本管理:
   模板 v1 → 发现解析失败 → DSPy 纠错 → 模板 v2
   → A/B 测试 → 全量切换

3. 多租户模板隔离:
   每个租户独立的模板命名空间
   模板优先级: 租户模板 > 全局模板
```

---

### 2.2 产品级 Web UI

**目标:** 响应式布局、交互体验提升、组件复用、性能优化

#### 2.2.1 集成点识别

| 组件 | v1.0 状态 | v1.1 变更 | 变更类型 |
|------|----------|----------|---------|
| **App.tsx** | List/Detail 硬切换 | 视图状态机 + 布局框架 | MODIFY |
| **AlertList** | 单一列表 | 支持多过滤条件 + 分页 | MODIFY |
| **AlertDetail** | 单一详情 | Tab 式详情 + 处置面板 | MODIFY |
| **状态管理** | Local state only | 引入 Context/Zustand | NEW |
| **布局组件** | 无 | Sidebar + Header + Content | NEW |
| **路由** | 无 | React Router 多视图 | NEW |

#### 2.2.2 UI 架构演进

**v1.0 架构 (单页双视图):**
```
App.tsx
├── view state: 'list' | 'detail'
├── Header (静态)
└── Main Content
    ├── AlertList (when view='list')
    └── AlertDetail (when view='detail')
```

**v1.1 架构 (多视图布局):**
```
App.tsx (布局容器)
├── Layout
│   ├── Header (Logo + 导航 + 用户)
│   ├── Sidebar (导航菜单)
│   └── Content Area
│       ├── /alerts (告警列表视图)
│       │   ├── AlertList
│       │   ├── AlertFilters
│       │   └── AlertDetail (内嵌或侧滑)
│       ├── /chat (AI 助手视图)
│       │   └── ChatInterface
│       └── /reports (报表视图)
│           ├── StatsDashboard
│           └── ReportCharts
```

#### 2.2.3 状态管理架构

```typescript
// stores/alertStore.ts
interface AlertStore {
  // 状态
  chains: AttackChain[];
  selectedChain: AttackChain | null;
  filters: AlertFilters;
  view: 'list' | 'detail';

  // Actions
  fetchChains: (params: FetchParams) => Promise<void>;
  selectChain: (chainId: string) => void;
  setFilters: (filters: AlertFilters) => void;
}

// stores/uiStore.ts
interface UIStore {
  sidebarOpen: boolean;
  activeView: 'alerts' | 'chat' | 'reports';
  theme: 'light' | 'dark';
}
```

#### 2.2.4 新增组件 vs 修改组件

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| Layout | NEW | 整体布局框架 | 依赖 React Router |
| Sidebar | NEW | 导航侧边栏 | 依赖 UI Store |
| Header | MODIFY | 扩展为多视图导航 | 依赖 UI Store |
| AlertFilters | NEW | 高级筛选组件 | 依赖 Alert Store |
| ChatInterface | NEW | AI 助手对话 UI | 依赖 MCP Server |
| StatsDashboard | NEW | 统计仪表板 | 依赖 Report API |
| ReportCharts | NEW | 图表组件 | 依赖 Chart Library |

---

### 2.3 AI 助手对话框

**目标:** 前端内嵌 AI 对话界面，上下文与当前页面/告警动态关联

#### 2.3.1 集成点识别

| 组件 | v1.0 状态 | v1.1 变更 | 变更类型 |
|------|----------|----------|---------|
| **MCP Server** | 在 STACK 中规划 | 实现 MCP Server | NEW |
| **MCP Client (Frontend)** | 不存在 | 实现前端 MCP Client | NEW |
| **AI Chat API** | 无 | 新增 /api/chat 端点 | NEW |
| **Chat Context Provider** | 不存在 | 动态上下文注入 | NEW |
| **DSPy Chat Signature** | 无 | ChatAnalyzerSignature | NEW |

#### 2.3.2 通信架构

**MCP Server 定位:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI AGENT LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  MCP Server (Model Context Protocol)                           │   │
│  │  - Tool Definitions (SECALERT alert analysis tools)            │   │
│  │  - Resource Templates (告警上下文注入)                          │   │
│  │  - Prompt Templates (安全分析最佳实践)                          │   │
│  │  Port: 8090                                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↑ SSE/WebSocket
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Chat Interface)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ChatInterface                                                   │   │
│  │  - 消息列表 (User/Assistant)                                    │   │
│  │  - 输入框 + 发送按钮                                             │   │
│  │  - 上下文指示器 (当前告警/选择实体)                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↑ HTTP POST (chat messages)
                              │
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /api/chat (WebSocket upgrade or SSE endpoint)                 │   │
│  │  - 消息转发到 MCP Server                                        │   │
│  │  - 会话管理 (session_id)                                        │   │
│  │  - 上下文注入                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 上下文注入机制

```python
# MCP Server 上下文注入
class SecAlertContext:
    """AI 助手上下文 - 动态注入当前页面状态"""

    def __init__(self, current_view: str, selected_alert: Optional[Alert]):
        self.current_view = current_view
        self.selected_alert = selected_alert
        self.filters = None  # 从 Frontend 传递

    def to_mcp_resource(self) -> dict:
        """转换为 MCP Resource 格式"""
        return {
            "alerts://current": {
                "view": self.current_view,
                "alert": self.selected_alert.dict() if self.selected_alert else None,
                "filters": self.filters
            }
        }

# MCP Tool Definitions
SECALERT_TOOLS = [
    {
        "name": "analyze_alert",
        "description": "深入分析当前告警的攻击意图和威胁程度",
        "input_schema": {
            "type": "object",
            "properties": {
                "chain_id": {"type": "string"},
                "depth": {"type": "string", "enum": ["quick", "deep"]}
            }
        }
    },
    {
        "name": "explain_attack_chain",
        "description": "解释攻击链中各步骤的关联关系",
        "input_schema": {
            "type": "object",
            "properties": {
                "chain_id": {"type": "string"}
            }
        }
    },
    {
        "name": "suggest_remediation",
        "description": "针对当前告警给出处置建议",
        "input_schema": {
            "type": "object",
            "properties": {
                "chain_id": {"type": "string"},
                "asset_ip": {"type": "string"}
            }
        }
    }
]
```

#### 2.3.4 前端-后端通信协议

```typescript
// ChatMessage 类型
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: {
    chain_id?: string;
    view?: string;
  };
}

// 通信方式选择
// 方案 A: Server-Sent Events (SSE) - 简单、实现成本低
// 方案 B: WebSocket - 双向通信、低延迟
// 推荐: 方案 A (SSE) - 单向流式输出足够，回调可用 HTTP POST

// API 端点
POST /api/chat
Request: { message: string, session_id: string, context: ChatContext }
Response: SSE stream of ChatMessage

GET /api/chat/history/:session_id
Response: ChatMessage[]
```

#### 2.3.5 新增组件 vs 修改组件

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| MCPServer | NEW | AI Agent 接口、Tool Definitions | 依赖 DSPy |
| MCPClient (Frontend) | NEW | MCP 协议客户端 | 依赖 ChatInterface |
| ChatInterface | NEW | 对话 UI 组件 | 依赖 MCPClient |
| ChatContextProvider | NEW | 全局上下文管理 | 依赖 UI Store |
| ChatAnalyzerSignature | NEW | DSPy 对话分析签名 | 依赖 DSPy |
| /api/chat | NEW | 聊天 API 端点 | 依赖 MCPServer |

---

### 2.4 报表统计仪表板

**目标:** 告警趋势、误报率统计、TOP 攻击类型、受影响资产、处置统计

#### 2.4.1 集成点识别

| 组件 | v1.0 状态 | v1.1 变更 | 变更类型 |
|------|----------|----------|---------|
| **Report API** | 无 | 新增 /api/reports 端点 | NEW |
| **ES Aggregations** | 基础使用 | 扩展聚合查询 | MODIFY |
| **ClickHouse** | 已部署未用 | 复杂分析查询 | MODIFY |
| **StatsDashboard** | 无 | 新 UI 组件 | NEW |
| **ReportCharts** | 无 | 图表库集成 | NEW |

#### 2.4.2 存储层选择: ES vs ClickHouse

| 维度 | Elasticsearch Aggregations | ClickHouse |
|------|----------------------------|------------|
| **适用场景** | 实时小规模聚合 (< 100万文档) | 大规模历史分析 (1000万+ 文档) |
| **查询延迟** | < 100ms (小规模) | < 1s (大规模) |
| **SQL 支持** | ES DSL | 原生 SQL |
| **实时性** | 实时 (写入即可查询) | 异步 (依赖定时摄入) |
| **当前状态** | 已用于告警存储和搜索 | 已部署待启用 |
| **v1.1 推荐** | **主力** - 实时聚合 | **备选** - 复杂历史报表 |

**决策: v1.1 以 Elasticsearch Aggregations 为主，ClickHouse 作为未来规模化备选**

#### 2.4.3 报表 API 设计

```python
# /api/reports.py
class ReportEndpoints:
    """报表统计 API"""

    @app.get("/api/reports/overview")
    async def get_overview(
        start_time: datetime,
        end_time: datetime
    ) -> OverviewStats:
        """
        概览统计:
        - 总告警数 / 已处置 / 已抑制
        - 误报率
        - 平均处置时间
        """
        query = {
            "size": 0,
            "query": {"range": {"timestamp": {"gte": start_time, "lte": end_time}}},
            "aggs": {
                "total": {"value_count": {"field": "chain_id"}},
                "by_status": {"terms": {"field": "status"}},
                "by_severity": {"terms": {"field": "max_severity"}}
            }
        }
        return es.search(index="alerts", body=query)

    @app.get("/api/reports/trends")
    async def get_trends(
        start_time: datetime,
        end_time: datetime,
        interval: str = "day"  # hour/day/week
    ) -> TrendData:
        """
        趋势数据:
        - 按时间间隔的告警数量
        - 误报率趋势
        - 处置率趋势
        """
        query = {
            "size": 0,
            "aggs": {
                "over_time": {
                    "date_histogram": {
                        "field": "timestamp",
                        "calendar_interval": interval
                    },
                    "aggs": {
                        "total": {"value_count": {"field": "chain_id"}},
                        "false_positives": {
                            "filter": {"term": {"status": "false_positive"}}
                        }
                    }
                }
            }
        }
        ...

    @app.get("/api/reports/top-attack-types")
    async def get_top_attack_types(limit: int = 10) -> List[AttackTypeStat]:
        """
        TOP 攻击类型统计
        """
        query = {
            "size": 0,
            "aggs": {
                "by_signature": {
                    "terms": {"field": "alert_signature.keyword", "size": limit}
                }
            }
        }
        ...
```

#### 2.4.4 数据模型扩展

```typescript
// 新增报表相关类型
interface OverviewStats {
  total_alerts: number;
  active_alerts: number;
  suppressed_alerts: number;
  false_positive_rate: number;
  avg_resolution_time_hours: number;
}

interface TrendData {
  interval: string;
  data_points: {
    timestamp: Date;
    total: number;
    false_positives: number;
    resolved: number;
  }[];
}

interface AttackTypeStat {
  signature: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}
```

#### 2.4.5 新增组件 vs 修改组件

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| ReportEndpoints | NEW | 报表 API 端点 | 依赖 ES |
| OverviewStats | NEW | 概览数据结构 | 依赖 ReportEndpoints |
| StatsDashboard | NEW | 统计仪表板 UI | 依赖 Report API |
| TrendChart | NEW | 趋势图组件 | 依赖 Chart Library |
| TopAttacksChart | NEW | TOP 攻击类型图 | 依赖 Chart Library |
| ES Aggregation Queries | MODIFY | 扩展现有聚合 | 依赖 ES |

---

## 3. 跨功能依赖关系

### 3.1 功能间依赖图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         依赖关系拓扑                                     │
│                                                                         │
│   [多数据源解析]                                                          │
│        │                                                                │
│        │ 提供解析后的标准化告警数据                                          │
│        ↓                                                                │
│   [报表统计] ───────────────────────────────────────┐                   │
│        │                                    │       │                   │
│        │ 报表数据依赖解析后的告警               │       │                   │
│        ↓                                    │       │                   │
│   [产品级 UI] ───────────────────────────────┘       │                   │
│        │                                              │                   │
│        │ UI 需要展示:                                  │                   │
│        │ - 告警列表/详情 (已有)                         │                   │
│        │ - AI 助手视图                                 │                   │
│        │ - 报表仪表板                                   │                   │
│        ↓                                              │                   │
│   [AI 助手] ←────────────────────────────────────────┘                   │
│        │                                                                │
│        │ AI 助手需要:                                                    │
│        │ - 告警上下文 (来自 UI 当前选中)                                   │
│        │ - 处置建议 (调用现有处置 API)                                    │
│        │ - MCP Server (新增组件)                                         │
│        │                                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 组件构建顺序

| 阶段 | 组件 | 原因 |
|------|------|------|
| **Phase 1** | Parser Registry + 模板扩展 | 所有功能依赖解析后的标准数据 |
| **Phase 2** | Report API + ES Aggregations | UI 仪表板需要数据源 |
| **Phase 3** | UI 布局框架 + 路由 | AI 助手和报表需要布局基础设施 |
| **Phase 4** | ChatInterface + MCP Server | 需要布局 + 处置 API |
| **Phase 5** | StatsDashboard + ReportCharts | 需要 Report API + 布局 |

---

## 4. 数据流汇总

### 4.1 v1.1 完整数据流

```
[异构安全设备 × N]
        │
        ↓
┌───────────────────────────────────────────────────────────────────┐
│  Vector (多源采集)                                                │
│  - Syslog (防火墙/WAF)                                            │
│  - JDBC (EDR/数据库审计)                                           │
│  - Webhook (云安全)                                                │
│  - File (日志文件)                                                 │
└───────────────────────────────────────────────────────────────────┘
        │
        ↓
┌───────────────────────────────────────────────────────────────────┐
│  Kafka (raw-events)                                               │
│  - 原始消息持久化到 MinIO                                          │
│  - Topic 分区用于并行处理                                          │
└───────────────────────────────────────────────────────────────────┘
        │
        ↓
┌───────────────────────────────────────────────────────────────────┐
│  Flink Stream Processing                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Parser Registry (多数据源解析)                              │ │
│  │  - 第一层: 模板匹配 (ParserRegistry.match_template)          │ │
│  │  - 第二层: Drain Cluster Pool                                │ │
│  │  - 第三层: DSPy Format Inference                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│        │                                                           │
│        ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Alert Processing                                           │ │
│  │  - 实体提取 (src_ip, dst_ip, alert_type)                    │ │
│  │  - 严重度分类 (Critical/High/Medium/Low)                     │ │
│  │  - 攻击链关联 (Neo4j)                                        │ │
│  │  - 误报判断 (DSPy Signature)                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┬───────────────────────┐
        ↓                  ↓                  ↓                       ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Elasticsearch │  │    Neo4j      │  │    MinIO     │  │  ClickHouse   │
│ (索引/搜索)    │  │ (攻击链图)    │  │ (原始日志)    │  │ (OLAP备选)    │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
        │                  │                                   ↑
        │                  │                                   │
        ↓                  ↓                                   │
┌───────────────────────────────────────────────────────────────────┐
│  FastAPI Backend                                                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐ │
│  │ /api/chains    │ │ /api/remediation│ │ /api/reports           │ │
│  │ (告警 CRUD)    │ │ (处置工作流)    │ │ (统计聚合)              │ │
│  └────────────────┘ └────────────────┘ └────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ /api/chat (SSE) - AI 助手对话                                  ││
│  │ - 消息转发到 MCP Server                                         ││
│  │ - 上下文注入 (当前告警/视图状态)                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ MCP Server (Port 8090)                                         ││
│  │ - Tool Definitions (analyze_alert, explain_attack_chain)      ││
│  │ - DSPy ChatAnalyzerSignature                                   ││
│  │ - Qwen3-32B LLM 调用                                           ││
│  └────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
        │
        ↓
┌───────────────────────────────────────────────────────────────────┐
│  React Frontend                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Layout (多视图布局)                                          │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                   │ │
│  │  │ /alerts   │ │ /chat     │ │ /reports  │                   │ │
│  │  │ 告警列表   │ │ AI 助手   │ │ 统计报表  │                   │ │
│  │  └───────────┘ └───────────┘ └───────────┘                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. API 端点汇总

### 5.1 v1.1 新增 API

| 端点 | 方法 | 用途 | 数据源 |
|------|------|------|--------|
| `/api/chat` | POST | AI 助手对话 (SSE 流式) | MCP Server |
| `/api/chat/history/{session_id}` | GET | 对话历史 | PostgreSQL |
| `/api/reports/overview` | GET | 概览统计 | ES Aggregation |
| `/api/reports/trends` | GET | 趋势数据 | ES Aggregation |
| `/api/reports/top-attack-types` | GET | TOP 攻击类型 | ES Aggregation |
| `/api/reports/assets` | GET | 受影响资产统计 | ES Aggregation |
| `/api/reports/resolution` | GET | 处置统计 | ES Aggregation |
| `/api/templates` | GET | 获取可用解析模板 | PostgreSQL |
| `/api/templates` | POST | 注册新模板 | PostgreSQL |
| `/api/templates/{id}` | PUT | 更新模板 | PostgreSQL |

### 5.2 现有 API (v1.0)

| 端点 | 用途 |
|------|------|
| `/api/chains` | 告警链列表/搜索 |
| `/api/chains/{id}` | 告警链详情 |
| `/api/remediation/chains/{id}` | 处置建议 |
| `/api/remediation/chains/{id}/acknowledge` | 确认已通报 |
| `/api/remediation/chains/{id}/restore` | 恢复误报 |

---

## 6. 架构决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| **AI 助手通信协议** | Server-Sent Events (SSE) | 单向流足够，回调简单，HTTP 兼容性好 |
| **报表数据源** | Elasticsearch Aggregations (主) + ClickHouse (备) | ES 已部署且满足 v1.1 规模，ClickHouse 用于未来规模化 |
| **前端状态管理** | Zustand | 轻量、无外部依赖、TypeScript 原生支持 |
| **UI 路由方案** | React Router v6 | 事实标准、视图隔离 |
| **MCP Server 端口** | 8090 | 避免与现有服务端口冲突 |
| **模板存储** | YAML 文件 + PostgreSQL 元数据 | 便于版本控制，支持运行时更新 |

---

## 7. 风险与注意事项

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **MCP 协议成熟度** | Medium | 先实现简化版 HTTP+JSON，回退方案 |
| **ES 聚合性能** | Medium | 限制时间范围，建立索引优化 |
| **多模板冲突** | Low | ParserRegistry 优先级机制 |
| **前端状态复杂度** | Low | 使用 Zustand 简化状态逻辑 |

### 7.2 非技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **用户体验一致性** | Medium | AI 助手和报表共享 Layout 组件 |
| **未来扩展** | Low | MCP Server Tool Definition 可扩展 |

---

## 8. 验证清单

- [x] 所有新功能识别了与现有架构的集成点
- [x] 数据流变更明确标注 NEW vs MODIFY
- [x] 组件依赖关系和构建顺序合理
- [x] API 端点设计覆盖所有新功能
- [x] 架构决策有明确理由
- [x] 风险识别和缓解措施到位

---

## 9. 参考资料

- 现有架构: `.planning/codebase/ARCHITECTURE.md`
- 现有技术栈: `.planning/codebase/STACK.md`
- 集成设计: `.planning/codebase/INTEGRATIONS.md`
- v1.0 研究: `.planning/research/SUMMARY.md`
- MCP Protocol 规范: [Anthropic MCP Documentation](https://modelcontextprotocol.io/)
- React Router v6: [React Router Documentation](https://reactrouter.com/)
- Zustand: [Zustand Documentation](https://zustand-demo.pmnd.rs/)

---

**置信度评估:**

| 领域 | 置信度 | 备注 |
|------|--------|------|
| 多数据源解析架构 | MEDIUM | 基于现有三层解析架构扩展，模式成熟 |
| UI 组件架构 | MEDIUM | React 模式公认，但需根据实际需求调整 |
| AI 助手通信 | LOW-MEDIUM | MCP 协议较新 (2024-2025)，实现细节待验证 |
| 报表技术选型 | MEDIUM | ES Aggregations 方案成熟，ClickHouse 备选需测试 |
