# Phase 2: Attack Chain Correlation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

将跨时间、跨设备的关联告警分组，形成完整的攻击链叙事。系统在 Phase 1（三层解析）的基础上，对已解析的 OCSF 格式告警进行关联分析，还原攻击路径。

Phase 2 验证标准：至少能对 Suricata 告警完成「告警→关联→攻击链」全流程，形成可展示的攻击链。

**输入：** Phase 1 输出（OCSF 格式告警，存储于 PostgreSQL/Elasticsearch）
**输出：** Neo4j 中的攻击链图数据 + 可视化时间线

</domain>

<decisions>
## Implementation Decisions

### 关联策略

- **关联引擎：** 规则引擎为主，Qwen3-32B 只在规则无法判断时兜底
- **UI 配置：** 关联指标默认隐藏，仅专家模式可配置
- **Source IP 关联：** IP 相同 + ATT&CK 攻击阶段逻辑合理才关联（非简单 IP 相同就关联）
- **目标资产匹配：** IP 相同优先，主机名相同为辅助（适应 DHCP 环境）
- **攻击类型关联：** 相同攻击类型 + 相同目标 = 关联
- **最小告警数：** ≥ 2 条告警才能形成攻击链

### 时间窗口

- **窗口策略：** 动态窗口（按告警频率自适应）
  - 短时间内大量同类告警 → 缩短窗口（如暴力破解 5min）
  - 零星告警 → 延长窗口（如后门 24h）
- **固定备选窗口：** 1 小时

### 攻击链存储与表示

- **存储：** Neo4j 图数据库
  - 节点 = 告警
  - 边 = 关联关系（IP 关联、资产关联、攻击类型关联）
- **展示：** 线性时间线为主，可展开查看分支
- **元数据：** 最小集存储（链 ID、开始时间、告警数量、严重程度、状态），完整上下文按需查询

### ATT&CK 映射

- **映射方法：** 规则 + LLM 混合
  - 所有已知告警类型走预置规则表映射到 ATT&CK
  - Qwen3-32B 仅在告警类型不在规则表时兜底推断
- **映射层级：** 战术（Tactic）+ 技术（Technique）
- **Phase 1 衔接：** Suricata 告警预置 ATT&CK 映射规则（由 Phase 1 的三层解析器输出告警类型后触发）

### Claude's Discretion

- 动态窗口的具体频率阈值算法（短时/长时的边界值）
- 规则引擎的关联条件组合 DSL 语法
- ATT&CK 规则映射表的具体格式和维护流程
- Neo4j 图谱的具体 schema 设计
- 分支展开的 UI 交互细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture

- `.planning/codebase/ARCHITECTURE.md` — 系统分层架构、Neo4j 定位为实体关系图存储、Flink 流处理引擎
- `.planning/codebase/STACK.md` — 技术栈版本（Neo4j、Flink、PostgreSQL、Qwen3-32B）

### Phase 1

- `.planning/phases/01-foundation-ingestion/01-CONTEXT.md` — 三层解析架构、OCSF 格式输出、Suricata EVE JSON 模板
- `.planning/codebase/CONVENTIONS.md` — OCSF 数据格式规范

### Integrations

- `.planning/codebase/INTEGRATIONS.md` — Kafka Consumer 配置、PostgreSQL/Elasticsearch 查询规范

### Project

- `.planning/PROJECT.md` — 核心约束：私有化离线部署、Qwen3-32B 推理、无外部云依赖、极简操作
- `.planning/ROADMAP.md` — Phase 2 成功标准（关联指标、攻击链时间线、ATT&CK 映射、攻击链详情展示）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `parser/templates/` — 预置解析模板目录结构（Phase 1 建立 Suricata EVE JSON 模板）
- `parser/dspy/signatures/LogParserSignature` — DSPy 解析签名（Phase 1 建立）
- `parser/registry.py` — 解析器注册机制（可参考为关联规则注册机制）

### Established Patterns

- 三层解析架构：模板优先 → Drain 聚类 → LLM 兜底（已确定）
- Qwen3-32B 统一推理（私有化离线部署）
- OCSF 标准格式作为数据交换格式
- Docker Compose 全家桶开发环境

### Integration Points

- Phase 1 → Phase 2：PostgreSQL/Elasticsearch 中的 OCSF 告警作为 Phase 2 输入
- Phase 2 → Phase 3：攻击链输出到 Phase 3（Core Analysis Engine）进行误报过滤
- Neo4j → 图查询 → 攻击链可视化

</code_context>

<specifics>
## Specific Ideas

- 动态窗口按告警频率自适应：暴力破解 5min，后门 24h，APT 数天
- 规则引擎为主，UI 专家模式可配置关联指标
- 攻击链线性时间线展示，有分支时可展开
- ATT&CK 规则映射表随系统运行持续积累扩展

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-attack-chain-correlation*
*Context gathered: 2026-03-23*
