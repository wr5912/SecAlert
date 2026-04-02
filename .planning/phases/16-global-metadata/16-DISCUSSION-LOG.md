# Phase 16: 全局元数据体系 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 16-global-metadata
**Areas discussed:** 元数据注入点, 字段验证严格度, OCSF映射策略, 向后兼容性

---

## 元数据注入点

| Option | Description | Selected |
|--------|-------------|----------|
| Ingestion Gateway 统一注入 (推荐) | 所有渠道先到 Gateway，统一注入 metadata 后写入 Kafka。架构清晰，中央控制，Phase 17-19 可复用同一入口。 | ✓ |
| 各渠道自己注入 | Webhook 处理器自己注入，Kafka Consumer 自己注入，REST Poller 自己注入。各自负责，更分散，但可能有遗漏。 | |
| 解析层注入 | 在 Flink Parser 解析时注入 metadata，耦合解析层，后续多渠道扩展复杂。 | |

**User's choice:** Ingestion Gateway 统一注入 (推荐)
**Notes:** —

---

## 字段验证严格度

| Option | Description | Selected |
|--------|-------------|----------|
| 全部必填 (推荐) | vendor_name + product_name + device_type + tenant_id + environment 必须填写，否则不让保存。高数据质量，但首次配置稍繁琐。 | ✓ |
| 核心字段必填 | 只强制 device_type + vendor_name（已有），product_name/tenant_id/environment 可选填，提供默认值填充。 | |
| 全部可选 | 所有字段均可选，后台自动推断或填充默认值。用户体验最流畅，但元数据可能不完整。 | |

**User's choice:** 全部必填 (推荐)
**Notes:** —

---

## OCSF映射策略

| Option | Description | Selected |
|--------|-------------|----------|
| 规则推断 (推荐) | 基于 device_type + log_format 规则自动推断 OCSF category/class。例如: firewall+CEF → category=2, class=2001。可覆盖、可自定义，平衡自动化与灵活性。 | |
| AI 推断 | 根据示例日志让 LLM 推断 OCSF 映射。更智能，但增加延迟，需要额外 AI 调用。 | |
| 纯手动配置 | 每个模板配置时手动选择 OCSF category/class。工作量大，但完全可控。 | |

**User's choice:** 规则判断+AI推断兜底
**Notes:** 规则优先，AI 兜底（置信度低时调用 LLM）

---

## 向后兼容性

| Option | Description | Selected |
|--------|-------------|----------|
| 迁移填充 (推荐) | 首次打开模板编辑页时，自动填充默认 metadata（vendor=Suricata, product=EVE JSON, device_type=ids, tenant_id=default, environment=prod）。用户可修改后保存。 | ✓ |
| 强制重新配置 | 要求用户重新编辑所有已有模板，填写 metadata。否则模板无法用于新渠道。用户体验差，但数据完整。 | |
| 静默默认值 | 模板继续使用，metadata 字段在后端自动填充默认值，前端不感知。用户体验最流畅，但可能有数据不一致风险。 | |

**User's choice:** 迁移填充 (推荐)
**Notes:** —

---

## Claude's Discretion

以下方向用户选择由 Claude 决定：
- metadata 默认值填充的具体策略（哪些字段有默认值，默认值是什么）
- v1.0 Suricata 模板的具体默认 metadata 值
- OCSF 规则表的初始覆盖范围
- DLQ 事件的 metadata 字段是否需要特殊标记

## Deferred Ideas

无 scope creep 情况。

