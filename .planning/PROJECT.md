# SecAlert

## What This Is

智能网络安全告警分析系统——帮助企业普通IT运维人员（非专业安全分析师）自动过滤海量告警，只呈现真正需要关注的安全威胁。

每天数万条异构安全设备告警，系统自动分析、自动判断误报、自动还原攻击链，运维人员只需处理真正有威胁的几条/几十条告警。

## Core Value

**帮助非专业运维人员自动过滤海量告警，只呈现真正需要关注的安全威胁。**

一切设计以此为纲：误报自动忽略、只报警真实攻击、界面极度简单、操作极度自动化。

## Requirements

### Validated

- [x] 系统能自动识别和解析未知格式的安全设备日志 — v1.0 (Phase 1, UAT ✅)
- [x] 系统能还原攻击链，呈现完整的攻击路径 — v1.0 (Phase 2, UAT ✅)
- [x] 系统能自动过滤误报，直接忽略 — v1.0 (Phase 3, UAT ✅)
- [x] 系统能检测真实攻击并报警 — v1.0 (Phase 3, UAT ✅)
- [x] 系统能给出简单明确的处置建议 — v1.0 (Phase 4, UAT ✅)
- [x] 界面简洁，面向非专业运维人员 — v1.0 (Phase 4, UAT ✅)

## Current Milestone: v1.5 多源异构安全日志采集优化

**Goal:** 扩展多渠道采集接入能力，建立可观测的采集监控体系，强化全局元数据标签

**Target features:**
- 多渠道接入后端：Kafka Topic 订阅、Webhook 接收网关、REST API / 数据库定时轮询
- 采集监控与 DLQ：死信队列（解析失败日志不丢失）、EPS 监控、采集延迟告警、背压机制
- 全局元数据体系：强制 vendor_name / product_name / device_type + OCSF target + tenant_id / environment

### Out of Scope

- 自动响应/自动阻断 — 系统只报警，不自动处置
- 专业安全分析师工具 — 用户是普通IT运维，不是安全专家
- 实时阻断防护 — 分析工具定位，不做边界防护
- 采集配置版本化与回滚 — 放到 v1.6

## Context

**用户画像**：企业普通IT运维人员，网络安全知识有限，非专业安全分析师。

**数据环境**：
- 异构安全设备（防火墙、IDS、终端安全、云安全等各式各样）
- 每天3万+条告警
- 日志格式各不相同，无法预知

**已有条件**：
- Qwen3-32B 已私有化离线部署
- 私有化部署环境，无外部云依赖

**核心挑战**：
- 未知格式适配 — 系统必须能自动适应各种未知设备
- 零样本学习 — 没有已知模板时也要能工作
- 极简操作 — 用户不需要安全专业知识

## Constraints

- **Tech**: 私有化离线部署，无外部云依赖
- **Performance**: 每天处理3万+条告警，延迟可接受
- **User**: 非专业运维人员，界面必须极度简单
- **AI**: 所有AI推理基于私有化Qwen3-32B

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 分析工具定位 | 非专业用户，不能做自动处置，风险太大 | ✅ v1.0 验证通过 |
| 误报自动忽略 | 运维人员不胜烦扰，自动过滤是核心价值 | ✅ v1.0 验证通过 |
| Qwen3-32B统一推理 | 离线部署，无外部API依赖 | ✅ v1.0 验证通过 |
| 三层解析架构 | 模板优先 → Drain聚类 → LLM兜底，平衡性能与准确性 | ✅ v1.0 验证通过 |
| 攻击链级别判断 | 不是单条告警，链内多条告警联合判断 | ✅ v1.0 验证通过 |
| 置信度0.0-1.0 | 连续分数，DSPy兼容 | ✅ v1.0 验证通过 |
| 置信度<0.5自动误报 | Critical/High严重度豁免 | ✅ v1.0 验证通过 |
| 四档分级 | Critical/High/Medium/Low | ✅ v1.0 验证通过 |
| ATT&CK严重度基准+上下文 | 技术基准+上下文系数调整 | ✅ v1.0 验证通过 |
| 规则优先+LLM兜底（处置建议） | 命中有模板的 technique_id 时直接填充，模板未命中时调用 DSPy LLM 生成 | ✅ v1.0 验证通过 |
| 攻击链存储策略 | Neo4j 图数据库存储攻击链，Alert 节点关联 AttackChain 节点 | ✅ v1.0 验证通过 |
| Docker Compose本地开发 | 单命令启动全部6个服务 | ✅ v1.0 验证通过 |
| Confluent Kafka 7.5.0 | 成熟稳定的Kafka发行版 | ✅ v1.0 验证通过 |
| Elasticsearch 8.11.0单节点 | 本地开发无需集群 | ✅ v1.0 验证通过 |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## v1.0 Shipped

**Shipped:** 2026-03-25
**Phases:** 4 | **Plans:** 15 | **Tasks:** 39 | **Files:** 170 | **LOC:** 28,760
**UAT:** 39/39 tests passed
**Gaps Fixed:** 6/6 (IG-01/02/03/04/05/06/08; IG-07 not_needed)

*Last updated: 2026-03-26 after Phase 10 completion*

---

## v1.5 多源异构安全日志采集优化

**Milestone started:** 2026-04-01
**Phases completed:** 16

### Phase 16: 全局元数据体系 (global-metadata)

**Goal:** GM-01 全局元数据强制注入 + GM-02 OCSF 映射

**Completed:** 2026-04-02
**Plans:** 3/3 | **Commits:** 8

**What was built:**
- `CollectionMetadata` 模型（vendor_name/product_name/device_type/tenant_id/environment/OCSF UIDs）
- `Environment` 枚举（PROD/DEV/TEST）
- `MetadataEnricher` 组件 — 将 metadata 注入事件 `_collection_metadata` 子对象
- `OCSFMapper` 组件 — 基于 device_type+log_format 推断 OCSF category_uid/class_uid，规则表覆盖 15+ 设备类型
- `create_template` — 创建时自动 OCSF 推断
- `update_template` — v1.0 迁移填充 + device_type/log_format 变化时 OCSF 重算
- `_get_default_metadata` — Suricata 默认值填充

**Key decisions:**
- `_collection_metadata` 子对象注入，不污染顶层字段
- 规则优先 + AI 兜底（AI 兜底暂未启用）
- v1.0 旧模板自动迁移填充
