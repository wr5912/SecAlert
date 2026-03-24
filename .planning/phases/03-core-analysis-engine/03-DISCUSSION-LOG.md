# Phase 3: Core Analysis Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 03-core-analysis-engine
**Areas discussed:** 分类策略, 误报处理, 严重度分级, Phase 衔接

---

## 1. 分类粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 攻击链级别（推荐） | Phase 2 输出的攻击链作为整体判断对象，链内多条告警联合判断，准确率更高 | ✓ |
| 单条告警级别 | Phase 1/2 解析后的单条 OCSF 告警独立判断，延迟更低但 Context 少 | |
| 两者都要 | 先在告警级别初筛，再在链级别复检，最完整但实现最复杂 | |

**User's choice:** 攻击链级别（推荐）

---

## 2. 置信度表示

| Option | Description | Selected |
|--------|-------------|----------|
| 0.0-1.0 连续分数（推荐） | DSPy 兼容、便于后续阈值调整、可视化展示灵活 | ✓ |
| 高/中/低 三档 | 简单直观，但丢失粒度 | |
| 百分比 (0-100%) | 非技术用户友好，但内部处理不便 | |

**User's choice:** 0.0-1.0 连续分数（推荐）

---

## 3. 误报处理方式

| Option | Description | Selected |
|--------|-------------|----------|
| 软删除 + 可恢复（推荐） | 标记为 suppressed 但不物理删除，operator 可从列表恢复，平衡安全性与可审计性 | ✓ |
| 物理删除 | 直接从系统移除，性能最优但无法恢复，风险高 | |
| 隔离区保留 | 移动到单独存储，operator 需要时查询，适合大量误报场景 | |

**User's choice:** 软删除 + 可恢复（推荐）

---

## 4. 误报率目标

| Option | Description | Selected |
|--------|-------------|----------|
| <30%（推荐） | 符合 ROADMAP 要求，非专业运维可接受的工作量 | ✓ |
| <20% | 更严格，但可能漏掉真实攻击 | |
| <40% | 更保守，减少漏报风险 | |

**User's choice:** <30%（推荐）

---

## 5. 严重度分级

| Option | Description | Selected |
|--------|-------------|----------|
| Critical/High/Medium/Low 四档（推荐） | 业界通用、好理解、与 ATT&CK severity 对齐 | ✓ |
| Critical/High/Low 三档 | 简化版，但 Medium 的缺失可能导致中间地带无处放 | |
| 1-5 数字档位 | 灵活但需要 Legend 说明，不够直观 | |

**User's choice:** Critical/High/Medium/Low 四档（推荐）

---

## 6. 严重度来源

| Option | Description | Selected |
|--------|-------------|----------|
| ATT&CK 技术严重度 + 上下文系数（推荐） | 基于 MITRE ATT&CK 的技术严重度基准，结合资产重要性、攻击阶段等上下文系数调整 | ✓ |
| LLM 直接判断 | 让 Qwen3-32B 直接输出严重度，最灵活但一致性差 | |
| 规则映射表 | 预置规则表定义每种攻击类型的严重度，最可预测但维护成本高 | |

**User's choice:** ATT&CK 技术严重度 + 上下文系数（推荐）

---

## 7. Phase 3 输入来源

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2 输出（攻击链）（推荐） | 直接消费 Neo4j 中的攻击链数据进行误报过滤，自然的数据流 | ✓ |
| Phase 1/2 告警都要 | 既处理关联前的单条告警，也处理关联后的攻击链，最完整 | |

**User's choice:** Phase 2 输出（攻击链）（推荐）

---

## 8. Phase 3 → 4 输出

| Option | Description | Selected |
|--------|-------------|----------|
| 过滤后的攻击链 + 严重度（推荐） | Phase 3 输出的真实攻击链（已过滤误报）带严重度标签，进入 Phase 4 生成处置建议 | ✓ |
| 仅严重度 + 链 ID | Phase 4 按需查询链详情，接口更解耦 | |
| 过滤报告 + 处置建议一起 | Phase 3 直接生成处置建议，但可能太早，Phase 4 才有完整 UI context | |

**User's choice:** 过滤后的攻击链 + 严重度（推荐）

---

## 9. 抑制阈值

| Option | Description | Selected |
|--------|-------------|----------|
| 置信度 < 0.5（推荐） | 低于一半把握视为误报，平衡抑制率和漏报风险 | ✓ |
| 置信度 < 0.6 | 更保守，减少漏报但抑制率下降 | |
| 置信度 < 0.4 | 更激进，抑制率高但可能误杀真实攻击 | |

**User's choice:** 置信度 < 0.5（推荐）

---

## Claude's Discretion

- ATT&CK 技术严重度基准表的具体数值
- 上下文系数调整算法
- 误报恢复列表的 UI 展示方式
- 抑制日志的详细程度

## Deferred Ideas

None — discussion stayed within phase scope
