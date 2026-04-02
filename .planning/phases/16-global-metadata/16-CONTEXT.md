# Phase 16: 全局元数据体系 - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

交付**全局元数据体系**——所有采集事件强制携带标准化元数据（vendor_name / product_name / device_type / tenant_id / environment），支持 OCSF target 映射。这是 v1.5 所有后续 phases（17/18/19）的基础设施。

**核心交付:**
1. `CollectionMetadata` 数据模型 — 强制元数据字段定义
2. `MetadataEnricher` 组件 — Ingestion Gateway 统一注入
3. `OCSFMapper` 组件 — 规则推断 + AI 兜底的 OCSF 映射
4. 扩展 `DataSourceTemplate` — 新增 metadata 字段 + 强制验证
5. 迁移填充逻辑 — v1.0 已有模板首次编辑时自动填充默认 metadata

**边界:** 仅限元数据和 OCSF 映射，不包含多渠道采集（Phase 17）、DLQ（Phase 18）、监控（Phase 19）。
</domain>

<decisions>
## Implementation Decisions

### 元数据注入架构
- **D-01:** Ingestion Gateway 统一注入 — 所有渠道（Webhook / REST Poller / Kafka Consumer / DB Poller）数据统一经过 Gateway，由 `MetadataEnricher` 在写入 Kafka 前注入 metadata。架构清晰，中央控制，Phase 17-19 可复用。
- **D-02:** Metadata Enricher 作为独立组件 — 位于 Ingestion Gateway 内部，负责元数据验证、默认值填充、注入到事件 payload。

### 字段验证严格度
- **D-03:** 全部字段必填 — 创建/编辑模板时，`vendor_name` + `product_name` + `device_type` + `tenant_id` + `environment` 均强制填写，否则不允许保存。后端 Pydantic 验证 + 前端表单验证双重保护。

### OCSF Target Mapping
- **D-04:** 规则推断优先 + AI 兜底 — 基于 `device_type` + `log_format` 规则表自动推断 OCSF `category_uid` / `class_uid`；规则无法确定时（置信度低），调用 DSPy/LLM 推断。
- **D-05:** OCSF 映射可覆盖 — 用户可以手动指定 OCSF 映射，覆盖规则推断结果。

### 向后兼容性
- **D-06:** 迁移填充模式 — v1.0 已有模板首次打开编辑页时，自动填充默认 metadata（vendor=Suricata, product=EVE JSON, device_type=ids, tenant_id=default, environment=prod），用户可修改后保存。避免强制重新配置的用户体验断层。

### 数据模型
- **D-07:** `CollectionMetadata` 独立模型 — 包含 vendor_name / product_name / device_type / tenant_id / environment / target_category_uid / target_class_uid，作为独立 Pydantic 模型嵌入 `DataSourceTemplate`。
- **D-08:** `IngestionSource` 扩展 — source_type 枚举扩展支持 KAFKA_SUBSCRIPTION / WEBHOOK / REST_POLLER / DB_POLLER。

### Claude's Discretion
- metadata 默认值填充的具体策略（哪些字段有默认值，默认值是什么）
- v1.0 Suricata 模板的具体默认 metadata 值（已在 D-06 给出初步值，实现时可微调）
- OCSF 规则表的初始覆盖范围（firewall/ids/waf 等常见设备类型）
- DLQ 事件的 metadata 字段是否需要特殊标记（is_dlq=true）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research & Requirements
- `docs/多源异构安全日志采集最佳实践调研.md` — 8 种采集渠道 4 层架构最佳实践，元数据强制标签要求
- `.planning/research/SUMMARY.md` — v1.5 研究综合，Ingestion Gateway 架构推荐，Pitfall 4（metadata 破坏现有解析）的预防要求
- `.planning/research/ARCHITECTURE.md` — Ingestion Gateway Service、Metadata Enricher 组件设计
- `.planning/research/STACK.md` — prometheus-client>=0.19.0 新增库，其余复用现有技术栈
- `.planning/research/PITFALLS.md` — Pitfall 4（强制 metadata 破坏现有解析）的预防：EnrichedEvent 模型必须透传
- `.planning/REQUIREMENTS.md` — GM-01（全局元数据强制注入）、GM-02（OCSF Target Mapping）需求定义

### Existing Code
- `src/api/ingestion_models.py` — 现有 `DataSourceTemplate`、`DeviceType`、`ConnectionConfig` 模型（将被扩展）
- `src/api/ingestion_endpoints.py` — 现有模板 CRUD API、DI-07/08/09 接口（将扩展 metadata 验证）
- `src/chain/kafka_consumer.py` — 现有 Kafka Consumer（参考，不直接修改）

### External Specs
- `OCSF Schema GitHub (ocsf/ocsf-schema)` — OCSF 标准规范，category_uid / class_uid 定义（外部参考）
- `confluent-kafka-python GitHub` — Kafka Producer/Consumer API（用于 Ingestion Gateway Kafka Producer）

### Phase Artifacts
- `.planning/milestones/v1.5-ROADMAP.md` — Phase 16 的 goal 和 success criteria

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- **Pydantic 模型** — `src/api/ingestion_models.py` 中的 `BaseModel`、`Field` 验证模式，直接扩展
- **FastAPI Router** — `src/api/ingestion_endpoints.py` 中的 `APIRouter` 模式，新增 endpoints 复用
- **设备类型枚举** — 现有 `DeviceType` 枚举（FIREWALL/IDS/VPN/SWITCH/ROUTER/WAF/OTHER），扩展时保持兼容

### Established Patterns
- **内存存储** — 当前 `_templates` 字典存储模板，实现 metadata 存储时需保持同一模式（生产环境替换为 DB）
- **Pydantic 验证** — 表单验证使用 `Field(..., description=...)` 模式

### Integration Points
- **扩展 `DataSourceTemplate`** — 新增 `metadata: CollectionMetadata` 字段
- **扩展 `TemplateCreate` / `TemplateUpdate`** — 新增 metadata 相关字段验证
- **新增 `/api/ingestion/templates/{id}/metadata`** — 元数据读写 endpoint（Phase 17 各渠道会调用）
- **Kafka Producer** — Ingestion Gateway 内部调用，将 enriched 事件写入 `raw-events` Topic

</codebase_context>

<specifics>
## Specific Ideas

- **vendor_name 默认值**: Suricata → "Suricata", 未知 → "unknown"
- **product_name 默认值**: Suricata EVE JSON → "EVE JSON", 未知 → "unknown"
- **tenant_id 默认值**: "default"（单租户场景）
- **environment 默认值**: "prod"（生产环境优先）
- **OCSF 规则表示例**: firewall + CEF → category_uid=2, class_uid=2001; ids + EVE JSON → category_uid=1, class_uid=1001

</specifics>

<deferred>
## Deferred Ideas

**None — 讨论保持在 phase scope 内。**

Phase 16 仅交付全局元数据基础设施，多渠道采集（Phase 17）、DLQ（Phase 18）、监控（Phase 19）独立实现。

</deferred>

---

*Phase: 16-global-metadata*
*Context gathered: 2026-04-02*
