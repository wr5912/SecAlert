# Phase 3: Core Analysis Engine - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

AI驱动的误报过滤和攻击检测引擎。系统在 Phase 2（攻击链关联）输出的基础上，对攻击链进行误报/真实攻击二分类，判断真实威胁并标注严重度。

**输入：** Phase 2 输出（Neo4j 中的攻击链）
**输出：** 已过滤的真实攻击链（带严重度标签）+ 误报链（suppressed 状态可恢复）
**目标：** 误报率 <30%，自动抑制误报，保留恢复能力

</domain>

<decisions>
## Implementation Decisions

### 分类粒度

- **D-01:** 攻击链级别判断 —— Phase 2 输出的攻击链作为整体判断对象，链内多条告警联合判断

### 分类策略

- **D-02:** 规则优先 + LLM 兜底（与 Phase 1/2 架构一致）
- **D-03:** 置信度使用 0.0-1.0 连续分数（DSPy 兼容）
- **D-04:** 抑制阈值：置信度 < 0.5 自动判定为误报并抑制

### 误报处理

- **D-05:** 软删除 + 可恢复 —— 误报标记为 suppressed 但不物理删除，operator 可从列表恢复
- **D-06:** 误报率目标：<30%（符合 ROADMAP 要求）

### 严重度分级

- **D-07:** 四档分级：Critical / High / Medium / Low（业界通用，与 ATT&CK 对齐）
- **D-08:** 严重度来源：ATT&CK 技术严重度基准 + 上下文系数调整

### Phase 衔接

- **D-09:** Phase 3 输入 = Phase 2 输出（Neo4j 中的攻击链）
- **D-10:** Phase 3 输出 = 过滤后的攻击链 + 严重度标签（进入 Phase 4 生成处置建议）

### Claude's Discretion

- ATT&CK 技术严重度基准表的具体数值
- 上下文系数调整算法（资产重要性、攻击阶段等如何量化）
- 误报恢复列表的 UI 展示方式
- 抑制日志的详细程度

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture

- `.planning/codebase/ARCHITECTURE.md` — 系统分层架构、Phase 3 在分析层的位置
- `.planning/codebase/STACK.md` — 技术栈（DSPy、Qwen3-32B、Neo4j）

### Phase 1 & 2

- `.planning/phases/01-foundation-ingestion/01-CONTEXT.md` — 三层解析架构、OCSF 格式
- `.planning/phases/02-attack-chain-correlation/02-CONTEXT.md` — 攻击链关联策略、Neo4j 存储
- `.planning/codebase/CONVENTIONS.md` — OCSF 数据格式规范

### Project

- `.planning/PROJECT.md` — 核心约束：私有化离线部署、Qwen3-32B 推理、极简操作
- `.planning/ROADMAP.md` — Phase 3 成功标准（分类、抑制、严重度、恢复、误报率）

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets

- `parser/dspy/programs/log_parser.py` — DSPy 程序模式，可参考为误报分类 DSPy 程序
- `parser/registry.py` — 解析器注册机制，可参考为分类器注册机制
- `src/chain/mitre/mapper.py` — ATT&CK 映射，可复用于技术严重度查询
- `src/chain/attack_chain/service.py` — 攻击链服务，了解链的数据结构

### Established Patterns

- 三层解析：模板优先 → Drain 聚类 → LLM 兜底
- 规则 + LLM 混合策略
- OCSF 标准格式
- Neo4j 图数据库存储

### Integration Points

- Phase 2 → Phase 3：Neo4j 攻击链 → 读取进行分类
- Phase 3 → Phase 4：过滤后攻击链 + 严重度 → 处置建议生成
- 分析结果 → PostgreSQL/Elasticsearch（分类结果存储）

</codebase_context>

<specifics>
## Specific Ideas

- 置信度阈值 0.5 作为抑制边界
- 误报不物理删除，保留恢复能力
- ATT&CK 技术严重度作为基准，结合上下文调整
- Phase 3 输出包含完整攻击链 + 严重度，进入 Phase 4

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-core-analysis-engine*
*Context gathered: 2026-03-24*
