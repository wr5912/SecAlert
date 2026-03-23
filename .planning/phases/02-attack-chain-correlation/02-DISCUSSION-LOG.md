# Phase 2: Attack Chain Correlation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 02-attack-chain-correlation
**Areas discussed:** 关联指标, 时间窗口, 攻击链表示, ATT&CK映射

---

## 关联指标

| Option | Description | Selected |
|--------|-------------|----------|
| 规则引擎为主（推荐） | 关联指标由规则引擎处理，UI 可配置，Qwen3-32B 只在规则无法判断时兜底 | ✓ |
| LLM 为主 | 关联由 Qwen3-32B 推断，自动发现隐含关联 | |
| 规则+LLM 混合 | 规则引擎做快速初筛，LLM 处理复杂关联场景 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 默认隐藏，专家模式 | 默认使用预置规则，关联指标不暴露给普通运维人员 | ✓ |
| 可配置（简单） | 提供 3-5 个常用开关，普通运维人员可调整 | |
| 完全可配置 | 高级运维人员可配置任意指标的权重、阈值、组合逻辑 | |

**User's choice:** 规则引擎为主 + 默认隐藏（专家模式）

---

| Option | Description | Selected |
|--------|-------------|----------|
| 是，IP 相同必关联 | Source IP 相同的所有告警自动关联 | |
| 否，需结合攻击阶段 | IP 相同 + 满足 ATT&CK 攻击阶段逻辑才关联 | ✓ |

**User's choice:** 否，需结合攻击阶段

| Option | Description | Selected |
|--------|-------------|----------|
| 精确 IP 匹配 | 目标 IP 完全相同才关联 | |
| IP + 主机名辅助 | IP 相同优先；主机名相同为辅助关联 | ✓ |
| 资产标签/业务系统 | 按业务系统标签匹配，不依赖 IP | |

**User's choice:** IP + 主机名辅助

| Option | Description | Selected |
|--------|-------------|----------|
| 攻击类型相同+目标相同=关联 | 相同攻击类型 + 相同目标 → 分布式攻击链 | ✓ |
| 攻击类型作为 ATT&CK 标签 | 攻击类型不参与关联计算，仅用于给形成的攻击链打标签 | |
| LLM 辅助判断相似性 | Qwen3-32B 判断两个告警的攻击类型是否相似且相关 | |

**User's choice:** 攻击类型相同+目标相同=关联

| Option | Description | Selected |
|--------|-------------|----------|
| ≥ 2 条（推荐） | 2 条关联告警即可形成链 | ✓ |
| ≥ 3 条 | 至少 3 条形成「准备→实施→影响」链 | |
| 按 ATT&CK 阶段数 | 至少覆盖 ATT&CK 2 个连续战术阶段才形成链 | |

**User's choice:** ≥ 2 条（推荐）

---

## 时间窗口

| Option | Description | Selected |
|--------|-------------|----------|
| 固定时间窗口（推荐） | 固定窗口如 5 分钟、1 小时、24 小时 | |
| 动态窗口 | 根据攻击类型动态调整窗口 | ✓ |
| 无窗口限制 | 任何时间的告警都可以关联 | |

**User's choice:** 动态窗口

| Option | Description | Selected |
|--------|-------------|----------|
| 按 ATT&CK 战术设置 | 不同战术对应不同窗口 | |
| 按告警频率自适应 | 短时间大量同类告警缩短窗口，零星告警延长窗口 | ✓ |
| LLM 辅助判断 | Qwen3-32B 判断是否跨越长窗口关联 | |

**User's choice:** 按告警频率自适应

---

## 攻击链表示

| Option | Description | Selected |
|--------|-------------|----------|
| Neo4j 图数据库（推荐） | 节点=告警，边=关联关系。天然支持路径查询，ATT&CK 可视化强 | ✓ |
| PostgreSQL JSON | 攻击链存为 JSON 数组，简单但图查询效率低 | |
| Elasticsearch nested | 全文本搜索强，但复杂图查询不如 Neo4j | |

**User's choice:** Neo4j 图数据库（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| 线性时间线 | 告警按时间顺序排列成线性链，最直观 | |
| 树状/分支结构 | 多个攻击者或多个目标时树状分支 | |
| 线性为主，可展开分支 | 默认线性展示，有分支时用户可展开查看 | ✓ |

**User's choice:** 线性为主，可展开分支

| Option | Description | Selected |
|--------|-------------|----------|
| 基础元数据 | 链 ID、开始/结束时间、告警数量、严重程度、状态 | |
| 完整上下文 | 基础 + 所有 Source IP、目标资产列表、ATT&CK 战术/技术、关联规则名称 | |
| 最小集+可扩展 | 仅链 ID、开始时间、告警数、严重程度。上下文按需查询 | ✓ |

**User's choice:** 最小集+可扩展

---

## ATT&CK映射

| Option | Description | Selected |
|--------|-------------|----------|
| 规则映射（推荐） | 每种告警类型预定义映射到 ATT&CK 战术/技术。快速准确 | |
| LLM 推断 | Qwen3-32B 根据告警内容推断 ATT&CK 战术/技术 | |
| 规则+LLM 混合 | 规则处理已知告警类型，LLM 处理规则无法映射的未知告警 | ✓ |

**User's choice:** 规则+LLM 混合

| Option | Description | Selected |
|--------|-------------|----------|
| 战术（Tactic） | 只映射到战术层，简单但粗糙 | |
| 战术 + 技术（推荐） | 映射到具体技术，足够详细且有据可查 | ✓ |
| 战术 + 技术 + 子技术 | 映射到子技术层，最详细但维护量大 | |

**User's choice:** 战术 + 技术（推荐）

| Option | Description | Selected |
|--------|-------------|----------|
| Suricata 走规则，其他走 LLM | Phase 1 的 Suricata 告警预置规则，其他设备类型由 Qwen3-32B 推断 | |
| 所有已知告警类型走规则，LLM 只处理未知格式 | 随着系统积累，映射规则表持续扩展 | ✓ |
| 全部 LLM，规则仅做加速 | 主要靠 Qwen3-32B 推断，规则只做置信度 Boost | |

**User's choice:** 所有已知告警类型走规则，LLM 只处理未知格式

---

## Claude's Discretion

- 动态窗口的具体频率阈值算法（短时/长时的边界值）
- 规则引擎的关联条件组合 DSL 语法
- ATT&CK 规则映射表的具体格式和维护流程
- Neo4j 图谱的具体 schema 设计
- 分支展开的 UI 交互细节

