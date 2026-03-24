# Phase 4: Recommendations & Polish - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

为非专业运维人员生成通俗易懂的处置建议，并提供简洁的运营界面。Phase 4 基于 Phase 3 输出的已分类攻击链（带严重度标签），生成处置建议并呈现给运维人员。

**输入：** Phase 3 输出（Neo4j 中的已分类攻击链，含严重度标签）
**输出：** 处置建议 + 运营 UI
**目标：** 运维人员无需安全专业知识即可完成事件响应

</domain>

<decisions>
## Implementation Decisions

### 处置建议生成策略

- **D-01:** 规则模板优先 + LLM 兜底（与 Phase 1/2/3 策略一致）
  - 预置 ATT&CK 处置建议模板库（按 Technique ID 索引）
  - 未知攻击类型由 Qwen3-32B 生成处置建议
- **D-02:** 混合内容风格：核心行动一行 + 可展开详细说明
  - 主行：通俗行动描述（"阻断 192.168.1.100 的 445 端口访问"）
  - 可展开：详细原因、具体步骤、ATT&CK 技术引用
- **D-03:** 建议必须引用具体资产信息（IP、主机名、端口）
  - 来自 Phase 2 的资产关联数据
  - 不使用通用描述（如"阻断可疑 IP"→"阻断 192.168.1.100"）

### ATT&CK 引用策略

- **D-04:** ATT&CK 战术/技术编号可选显示
  - 默认不显示（面向非专业人员）
  - 点击"技术详情"可展开 ATT&CK 引用（如 T1190 - Exploit Public-Facing Application）

### 攻击链摘要展示

- **D-05:** 简化线性时间线
  - 关键节点：攻击源 IP → 主要攻击行为 → 受影响资产 → 攻击阶段
  - 阶段标签：Reconnaissance → Exploitation → Persistence → ...（非专业人员可理解）
  - 不显示完整时间线（Phase 2 完整数据保留，Phase 4 只做简化呈现）

### UI 默认视图

- **D-06:** 默认只显示 Critical + High 严重度告警
  - 运维人员每天只看真正需要关注的
  - Medium/Low 提供筛选功能可手动查看
  - 不默认显示全部（避免信息过载）

### 单屏设计

- **D-07:** 告警详情必须单屏呈现
  - 攻击链摘要（简化线性时间线） + 处置建议（一行核心行动）+ 操作按钮
  - 不需要滚动或页面跳转
  - 一眼可看到全部关键信息

### 响应工作流

- **D-08:** 运维人员处置选项
  - "确认已通报"：标记为已响应，记录 timestamp + 操作者
  - "确认为误报"：将告警恢复为活跃状态（与 Phase 3 restore_chain API 打通）
  - 可选备注字段

### 误报恢复

- **D-09:** Phase 4 UI 集成误报恢复功能
  - 在告警列表中提供"已抑制告警"入口
  - 运维可查看并恢复被 Phase 3 错误抑制的告警
  - 与 Phase 3 `restore_chain` API 打通

### UI 技术栈

- **D-10:** React 前端
  - 组件化开发，与 FastAPI JSON API 对接
  - 告警列表 + 详情单屏 + 简化攻击链时间线

### Claude's Discretion

- ATT&CK 处置建议模板库的具体内容（按 Technique 积累）
- React 组件结构设计（列表组件、详情单屏组件、时间线组件）
- 简化时间线的数据转换逻辑（从 Phase 2 完整数据提取关键节点）
- 建议可展开详情的交互方式（折叠面板、Tooltip、还是 Modal）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture

- `.planning/codebase/ARCHITECTURE.md` — 系统分层架构、Phase 4 在分析层的位置（处置建议 + UI）、API 入口点
- `.planning/codebase/STACK.md` — 技术栈版本（FastAPI、Neo4j、Qwen3-32B）

### Phase 1 & 2 & 3

- `.planning/phases/01-foundation-ingestion/01-CONTEXT.md` — 三层解析架构、OCSF 格式
- `.planning/phases/02-attack-chain-correlation/02-CONTEXT.md` — 攻击链关联策略、Neo4j 存储、资产关联数据
- `.planning/phases/03-core-analysis-engine/03-CONTEXT.md` — 分类器、严重度分级、restore_chain API、false_positive 恢复机制
- `.planning/codebase/CONVENTIONS.md` — OCSF 数据格式规范

### Project

- `.planning/PROJECT.md` — 核心约束：私有化离线部署、Qwen3-32B 推理、极简操作、非专业运维人员
- `.planning/ROADMAP.md` — Phase 4 成功标准（处置建议、资产引用、Critical/High 默认、单屏、完整响应流程）

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets

- `src/analysis/service.py` — AnalysisService，含 `classify_chain`、`restore_chain`、`list_false_positives` 方法
- `src/api/chain_endpoints.py` — FastAPI endpoints，`/api/chains` 路由
- `src/analysis/metrics.py` — FalsePositiveMetricsCollector，误报率统计
- `src/graph/client.py` — Neo4jClient，链状态更新（status: active/false_positive/resolved）
- `src/chain/mitre/mapper.py` — ATT&CK 映射，可复用获取 Technique 处置建议

### Established Patterns

- 规则优先 + LLM 兜底策略（三层解析、分类器、处置建议均采用）
- Neo4j 图数据库存储（攻击链、关联数据）
- OCSF 标准格式
- 四档严重度分级（Critical / High / Medium / Low）
- Docker Compose 本地开发

### Integration Points

- Phase 3 → Phase 4：Neo4j 攻击链（含 severity 标签）→ 读取生成处置建议
- Phase 4 UI → Phase 3 API：`restore_chain` 误报恢复
- Phase 4 UI → Phase 2 数据：资产关联信息（IP、主机名、端口）

</codebase_context>

<specifics>
## Specific Ideas

- ATT&CK 处置建议模板按 Technique ID 积累，随系统运行扩展
- Phase 4 UI 的"已抑制告警"入口与正常告警列表分开显示
- Phase 2 完整攻击链时间线保留，Phase 4 只做简化提炼呈现
- 响应工作流记录：timestamp + 操作者 + 处置选项 + 备注

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-recommendations-polish*
*Context gathered: 2026-03-24*
