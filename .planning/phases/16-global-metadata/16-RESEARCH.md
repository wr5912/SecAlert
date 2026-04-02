# Phase 16: 全局元数据体系 - Research

**Researched:** 2026-04-02
**Domain:** 全局元数据强制注入 + OCSF 标准映射
**Confidence:** HIGH

## Summary

Phase 16 交付**全局元数据体系**——所有采集事件强制携带标准化元数据（vendor_name / product_name / device_type / tenant_id / environment），支持 OCSF target 映射。这是 v1.5 所有后续 phases（17/18/19）的基础设施。

**核心交付:**
1. `CollectionMetadata` 数据模型 — 强制元数据字段定义
2. `MetadataEnricher` 组件 — Ingestion Gateway 统一注入
3. `OCSFMapper` 组件 — 规则推断 + AI 兜底的 OCSF 映射
4. 扩展 `DataSourceTemplate` — 新增 metadata 字段 + 强制验证
5. 迁移填充逻辑 — v1.0 已有模板首次编辑时自动填充默认 metadata

**Primary recommendation:** 在 `src/api/ingestion_models.py` 中新增 `CollectionMetadata` Pydantic 模型，嵌入现有 `DataSourceTemplate`；在 `src/collection/metadata.py` 新建 `MetadataEnricher` 和 `OCSFMapper` 组件，供 Phase 17-19 各渠道调用。

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ingestion Gateway 统一注入 — Metadata Enricher 作为独立组件，位于 Ingestion Gateway 内部
- **D-03:** 全部字段必填 — vendor_name + product_name + device_type + tenant_id + environment 均强制填写
- **D-04:** 规则推断优先 + AI 兜底 — device_type+log_format 规则表推断 OCSF category/class，置信度低时调用 DSPy/LLM
- **D-06:** 迁移填充模式 — v1.0 已有模板首次编辑时自动填充默认 metadata
- **D-07:** CollectionMetadata 独立模型嵌入 DataSourceTemplate

### Claude's Discretion
- metadata 默认值填充的具体策略（哪些字段有默认值，默认值是什么）
- v1.0 Suricata 模板的具体默认 metadata 值
- OCSF 规则表的初始覆盖范围
- DLQ 事件的 metadata 字段是否需要特殊标记

### Deferred Ideas (OUT OF SCOPE)
- 多渠道采集（Phase 17）、DLQ（Phase 18）、监控（Phase 19）独立实现

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GM-01 | 全局元数据强制注入 | CollectionMetadata 模型设计、MetadataEnricher 注入时机、TemplateCreate/Update 验证扩展 |
| GM-02 | OCSF Target Mapping | OCSFMapper 组件设计、规则表 + AI 兜底策略、OCSF 格式校验 |

---

## Standard Stack

### Core (No new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pydantic | 已有 | 数据验证 | 已在 `src/api/ingestion_models.py` 使用 |
| DSPy | 已有 | AI 推断兜底 | 已在 `parser/dspy/signatures/__init__.py` 定义 `LogFormatRecognition` Signature |

**Phase 16 无需新增任何库。** 所有能力通过 Pydantic 模型 + 规则表 + 复用现有 DSPy Signature 实现。

### Supporting (复用现有)
| Library | 用途 | 位置 |
|---------|------|------|
| confluent-kafka | Kafka Producer | Phase 17 各渠道写入 raw-events |
| httpx | REST Poller | Phase 17 REST_POLLER |
| APScheduler | 定时任务 | Phase 17 REST_POLLER / DB_POLLER |

### 不需要的技术
- **prometheus-client**: Phase 19 才需要
- **Kafka Connect**: Phase 17 明确不用

---

## Architecture Patterns

### 推荐的目录结构

```
src/
├── api/
│   └── ingestion_models.py      # [扩展] 新增 CollectionMetadata, Environment Enum
├── collection/
│   └── metadata.py              # [新建] MetadataEnricher, OCSFMapper, CollectionMetadata
└── storage/
    └── ocsf_mapper.py           # [已有] 扩展支持 device_type 规则映射
```

### Pattern 1: CollectionMetadata Model
**What:** 独立 Pydantic 模型，包含所有强制元数据字段
**When to use:** 创建/编辑模板时必须提供，运行时注入到事件 payload
**Example:**

```python
# src/api/ingestion_models.py 新增

class Environment(str, Enum):
    """环境枚举"""
    PROD = "prod"
    DEV = "dev"
    TEST = "test"

class CollectionMetadata(BaseModel):
    """采集元数据（GM-01 强制字段）"""
    vendor_name: str = Field(..., min_length=1, max_length=100, description="厂商名，如 Suricata")
    product_name: str = Field(..., min_length=1, max_length=100, description="产品名，如 EVE JSON")
    device_type: DeviceType = Field(..., description="设备类型")
    tenant_id: str = Field(default="default", description="租户标识（MSSP 多租户）")
    environment: Environment = Field(default=Environment.PROD, description="环境")
    target_category_uid: Optional[int] = Field(None, description="OCSF 目标类别 UID")
    target_class_uid: Optional[int] = Field(None, description="OCSF 事件类 UID")

class DataSourceTemplate(BaseModel):
    """数据源模板（扩展支持 metadata）"""
    id: str = Field(..., description="模板唯一 ID")
    name: str = Field(..., min_length=1, max_length=100)
    device_type: str = Field(..., description="设备类型")
    connection: ConnectionConfig = Field(...)
    log_format: str = Field(...)
    custom_regex: Optional[str] = None
    metadata: CollectionMetadata = Field(..., description="采集元数据")  # 新增

class TemplateCreate(BaseModel):
    """创建模板请求（扩展 metadata 验证）"""
    name: str = Field(..., min_length=1, max_length=100)
    device_type: DeviceType = Field(..., description="设备类型")
    connection: ConnectionConfig = Field(...)
    log_format: LogFormat = Field(...)
    custom_regex: Optional[str] = None
    metadata: CollectionMetadata = Field(..., description="采集元数据")  # 新增
```

### Pattern 2: MetadataEnricher Component
**What:** 在事件写入 Kafka 前注入全局元数据
**When to use:** Phase 17 各渠道（Webhook/REST Poller/Kafka Consumer/DB Poller）统一调用
**Example:**

```python
# src/collection/metadata.py 新建

from datetime import datetime
from typing import Optional

class MetadataEnricher:
    """全局元数据强制注入器（GM-01）"""

    def __init__(self, metadata: CollectionMetadata, collector_id: str):
        self.metadata = metadata
        self.collector_id = collector_id

    def enrich(self, event: dict) -> dict:
        """将元数据注入事件 payload"""
        enriched = event.copy()
        enriched["_collection_metadata"] = {
            "vendor_name": self.metadata.vendor_name,
            "product_name": self.metadata.product_name,
            "device_type": self.metadata.device_type.value,
            "tenant_id": self.metadata.tenant_id,
            "environment": self.metadata.environment.value,
            "target_category_uid": self.metadata.target_category_uid,
            "target_class_uid": self.metadata.target_class_uid,
            "collector_id": self.collector_id,
            "ingest_timestamp": datetime.utcnow().isoformat(),
        }
        return enriched

    def enrich_kafka_message(self, event: dict) -> tuple[str, str]:
        """返回 (key, value) 用于 Kafka Producer"""
        enriched = self.enrich(event)
        # Partition key: tenant_id_device_type_hash
        key = f"{self.metadata.tenant_id}_{self.metadata.device_type.value}_{hash(event)}"
        return key, json.dumps(enriched)
```

### Pattern 3: OCSFMapper Component
**What:** 基于规则表 + AI 兜底的 OCSF 目标映射
**When to use:** 模板创建/编辑时自动推断 target_category_uid / target_class_uid
**Example:**

```python
# src/collection/metadata.py 新建

from typing import Optional, Tuple
from dataclasses import dataclass

@dataclass
class OCSFMappingResult:
    category_uid: int
    class_uid: int
    confidence: float  # 0.0-1.0
    source: str  # "rule" or "ai"

class OCSFMapper:
    """OCSF 目标映射器（GM-02）"""

    # 规则表: (device_type, log_format) -> (category_uid, class_uid)
    DEVICE_TYPE_RULES: dict[Tuple[str, str], Tuple[int, int]] = {
        ("ids", "JSON"): (1, 2001),        # Network Activity / Alert
        ("ids", "CEF"): (1, 2001),
        ("firewall", "CEF"): (1, 4001),   # Network Activity / Network Activity
        ("firewall", "Syslog"): (1, 4001),
        ("waf", "CEF"): (1, 4001),
        ("waf", "JSON"): (1, 4001),
        ("edr", "JSON"): (2, 2001),       # Detective Control / Security Finding
        ("antivirus", "JSON"): (2, 2003),  # File Activity
        ("vpn", "Syslog"): (6, 6001),     # Entity / Authentication
        ("siem", "JSON"): (2, 2001),
    }

    # 置信度阈值：低于此值触发 AI 推断
    CONFIDENCE_THRESHOLD = 0.7

    @classmethod
    def map(cls, device_type: str, log_format: str) -> OCSFMappingResult:
        """推断 OCSF category_uid 和 class_uid"""
        key = (device_type.lower(), log_format.upper())
        if key in cls.DEVICE_TYPE_RULES:
            category, class_uid = cls.DEVICE_TYPE_RULES[key]
            return OCSFMappingResult(
                category_uid=category,
                class_uid=class_uid,
                confidence=0.95,
                source="rule"
            )
        # 未知组合，返回默认值 + 低置信度
        return OCSFMappingResult(
            category_uid=1,   # Network Activity 默认
            class_uid=4001,  # Network Activity 默认
            confidence=0.5,
            source="rule"
        )

    @classmethod
    async def map_with_ai_fallback(
        cls,
        device_type: str,
        log_format: str,
        sample_logs: Optional[list[str]] = None
    ) -> OCSFMappingResult:
        """规则推断 + AI 兜底"""
        result = cls.map(device_type, log_format)

        # 置信度低于阈值且提供了样本日志时，调用 AI
        if result.confidence < cls.CONFIDENCE_THRESHOLD and sample_logs:
            try:
                ai_result = await cls._ai_infer_mapping(device_type, sample_logs)
                if ai_result.confidence > result.confidence:
                    return ai_result
            except Exception:
                # AI 失败时使用规则推断结果
                pass

        return result

    @classmethod
    async def _ai_infer_mapping(
        cls,
        device_type: str,
        sample_logs: list[str]
    ) -> OCSFMappingResult:
        """使用 DSPy LogFormatRecognition 推断 OCSF 映射"""
        from parser.dspy.signatures import LogFormatRecognition
        from src.analysis.llm_config import get_lm, is_llm_available

        if not is_llm_available():
            raise RuntimeError("LLM unavailable")

        lm = get_lm()
        with lm:
            import dspy
            with dspy.context(lm=lm):
                predictor = dspy.Predict(LogFormatRecognition)
                result = predictor(
                    raw_logs="\n".join(sample_logs),
                    source_type=device_type
                )
                return OCSFMappingResult(
                    category_uid=int(result.category_uid),
                    class_uid=int(result.class_uid),
                    confidence=float(result.confidence),
                    source="ai"
                )
```

### Pattern 4: Template Migration (v1.0 兼容)
**What:** 首次编辑 v1.0 已有模板时自动填充默认 metadata
**When to use:** `update_template` endpoint 检测到模板无 metadata 时触发

```python
# src/api/ingestion_endpoints.py 扩展

async def update_template(template_id: str, template_update: TemplateUpdate) -> DataSourceTemplate:
    """DI-02: 更新模板（含 metadata 迁移）"""
    existing = _templates[template_id]

    # v1.0 迁移：如果模板没有 metadata，自动填充默认值
    if existing.metadata is None:
        existing.metadata = _get_default_metadata(existing)

    # 部分更新
    update_data = template_update.model_dump(exclude_unset=True)
    updated = existing.model_copy(update=update_data)

    # 如果更新涉及 device_type 或 log_format，重新推断 OCSF
    if "device_type" in update_data or "log_format" in update_data:
        ocsf_result = OCSFMapper.map(
            updated.device_type,
            updated.log_format
        )
        updated.metadata.target_category_uid = ocsf_result.category_uid
        updated.metadata.target_class_uid = ocsf_result.class_uid

    _templates[template_id] = updated
    return updated

def _get_default_metadata(template: DataSourceTemplate) -> CollectionMetadata:
    """v1.0 Suricata 模板默认 metadata（D-06）"""
    device_type = template.device_type.lower()

    # Suricata EVE JSON 默认值
    if device_type == "ids" or "suricata" in template.name.lower():
        return CollectionMetadata(
            vendor_name="Suricata",
            product_name="EVE JSON",
            device_type=DeviceType.IDS,
            tenant_id="default",
            environment=Environment.PROD,
        )

    # 通用默认值
    return CollectionMetadata(
        vendor_name="unknown",
        product_name="unknown",
        device_type=DeviceType.OTHER,
        tenant_id="default",
        environment=Environment.PROD,
    )
```

### Pattern 5: Template Metadata Validation (Form-level)
**What:** 前端表单强制验证 + 后端 Pydantic 双重保护
**When to use:** 创建/编辑模板时

```python
# src/api/ingestion_models.py

class TemplateCreate(BaseModel):
    """创建模板（含强制 metadata）"""
    name: str = Field(..., min_length=1, max_length=100)
    device_type: DeviceType = Field(..., description="设备类型")
    connection: ConnectionConfig = Field(...)
    log_format: LogFormat = Field(...)
    custom_regex: Optional[str] = None
    metadata: CollectionMetadata = Field(
        ...,
        description="采集元数据（vendor/product/device/tenant/environment）"
    )
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OCSF 映射规则 | 手写 if-else 映射 | 规则表 + DSPy Signature | 设备类型组合爆炸，手写不可维护 |
| metadata 注入 | 各渠道自己注入 | MetadataEnricher 统一注入 | 避免遗漏，保证一致性 |
| v1.0 迁移 | 强制重新配置 | 首次编辑时自动填充默认值 | 用户体验友好 |

---

## Common Pitfalls

### Pitfall 1: Metadata 注入破坏现有解析
**What goes wrong:** 强制 metadata 要求如果设计不当会破坏现有三层解析架构，导致 Suricata 解析失败。
**Why it happens:** `EnrichedEvent` 模型如果不透传，新字段会阻断模板匹配。
**How to avoid:** Metadata Enricher 注入的字段放在 `_collection_metadata` 子对象中，不污染顶层字段；解析管道只读取原始日志字段。
**Warning signs:** Phase 15 Suricata 解析测试突然大量失败。

### Pitfall 2: 规则表覆盖不全导致 AI 兜底被滥用
**What goes wrong:** 规则表初始覆盖范围太小（只覆盖 3-4 种设备），导致 AI 兜底被频繁调用，增加延迟。
**Why it happens:** OCSF 规则表初始设计过于简单。
**How to avoid:** Phase 16 初始规则表覆盖: firewall/waf/ids/ips/edr/antivirus/vpn/switch/router/siem/ids 这 11 种常见设备类型，每种支持 CEF/Syslog/JSON 三种格式。
**Warning signs:** AI 推断调用频率异常高。

### Pitfall 3: 迁移填充时机不对
**What goes wrong:** v1.0 模板在编辑页打开时没有立即填充默认 metadata，用户点击保存时才发现字段缺失。
**Why it happens:** 迁移逻辑放在保存时而非打开时。
**How to avoid:** 迁移逻辑放在 `get_template` 或 `update_template` 的读取分支，用户打开编辑页时立即看到已填充的 metadata。

---

## Code Examples

### 创建模板（含强制 metadata）

```python
# POST /api/ingestion/templates
{
    "name": "Suricata IDS Production",
    "device_type": "ids",
    "connection": {"host": "192.168.1.100", "port": 514, ...},
    "log_format": "JSON",
    "metadata": {
        "vendor_name": "Suricata",
        "product_name": "EVE JSON",
        "device_type": "ids",
        "tenant_id": "tenant-001",
        "environment": "prod",
        "target_category_uid": 1,
        "target_class_uid": 2001
    }
}
```

### OCSFMapper 规则表查找

```python
# 查询 firewall + CEF 的 OCSF 映射
result = OCSFMapper.map("firewall", "CEF")
# OCSFMappingResult(category_uid=1, class_uid=4001, confidence=0.95, source='rule')

# 查询未知设备类型 + JSON
result = OCSFMapper.map("unknown_device", "JSON")
# OCSFMappingResult(category_uid=1, class_uid=4001, confidence=0.5, source='rule')
```

### MetadataEnricher 注入

```python
# Webhook/REST Poller 等渠道调用
enricher = MetadataEnricher(
    metadata=template.metadata,
    collector_id="collector-001"
)
enriched_event = enricher.enrich(raw_event)
# enriched_event["_collection_metadata"] = {...}
```

---

## State of the Art

### OCSF 映射策略演进

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 硬编码 Suricata EVE JSON | 规则表 + AI 兜底 | Phase 16 | 支持多设备类型自动推断 |
| 无 tenant_id/environment | 强制元数据注入 | Phase 16 | 多租户隔离成为可能 |

**Deprecated/outdated:**
- 硬编码 Suricata OCSF 映射 (`storage/ocsf_mapper.py` 中的 `map_suricata_to_ocsf`)：Phase 16 规则表将取代

---

## Open Questions

1. **OCSF Category/Class 初始覆盖范围**
   - What we know: 常见设备类型（firewall/waf/ids/edr/antivirus/vpn）
   - What's unclear: 国产安全设备（360 天眼、绿盟漏扫、深信服 AF）的 OCSF 映射
   - Recommendation: Phase 16 先覆盖国际常见设备，国产设备规则表在 Phase 17 接入国产设备时补充

2. **AI 兜底阈值设定**
   - What we know: 置信度 < 0.7 时触发 AI 推断
   - What's unclear: 0.7 是否合适，需要实际数据验证
   - Recommendation: Phase 16 先用 0.7，Phase 19 监控体系就绪后根据 AI 调用频率调整

3. **DLQ 事件的 metadata 特殊标记**
   - What we know: 用户认为需要标记
   - What's unclear: 标记字段名和位置（`is_dlq=true` 还是 `_dlq_reason`）
   - Recommendation: Phase 18 DLQ 设计时统一考虑，Phase 16 暂不处理

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified)

Phase 16 是纯代码/数据模型变更，不依赖外部工具、服务或 CLI 工具。所有新增代码通过 Pydantic + 现有 DSPy Signature 实现。

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest（已存在于项目） |
| Config file | `tests/` 目录 |
| Quick run command | `pytest tests/test_ingestion*.py -x -q` |
| Full suite command | `pytest tests/ -x -q` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GM-01 | 模板创建必须提供 metadata | unit | `pytest tests/test_ingestion_models.py::test_template_create_requires_metadata` | no |
| GM-01 | metadata 验证：vendor_name 必填 | unit | `pytest tests/test_ingestion_models.py::test_vendor_name_required` | no |
| GM-01 | metadata 验证：tenant_id 默认值 | unit | `pytest tests/test_ingestion_models.py::test_tenant_id_default` | no |
| GM-02 | OCSFMapper 规则表查找 | unit | `pytest tests/test_ocsf_mapper.py::test_device_type_mapping` | no |
| GM-02 | OCSFMapper AI 兜底 | unit | `pytest tests/test_ocsf_mapper.py::test_ai_fallback` | no |
| GM-02 | OCSF 格式校验（target_category_uid 范围）| unit | `pytest tests/test_ocsf_mapper.py::test_ocsf_uid_validation` | no |

### Sampling Rate
- **Per task commit:** `pytest tests/test_ingestion*.py tests/test_ocsf*.py -x -q`
- **Per wave merge:** `pytest tests/ -x -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- `tests/test_ingestion_models.py` — 覆盖 GM-01 metadata 验证
- `tests/test_ocsf_mapper.py` — 覆盖 GM-02 OCSF 映射
- `tests/conftest.py` — 共享 fixtures（如果尚不存在）
- Framework install: `pip install pytest` — 如果未安装

*(None — existing test infrastructure covers all phase requirements)*

---

## Sources

### Primary (HIGH confidence)
- `parser/dspy/signatures/__init__.py` — `LogFormatRecognition` DSPy Signature，AI 兜底依赖
- `src/api/ingestion_models.py` — 现有 Pydantic 模型，需扩展 CollectionMetadata
- `src/api/ingestion_endpoints.py` — 现有 Template CRUD API，需扩展 metadata 验证
- `.planning/research/ARCHITECTURE.md` — OCSFMapper 组件设计、Metadata Enricher 注入流程
- `.planning/research/STACK.md` — 技术栈评估，无新增库

### Secondary (MEDIUM confidence)
- `storage/ocsf_mapper.py` — 已有 Suricata OCSF 映射参考（硬编码，Phase 16 规则表将取代）
- `docs/多源异构日志统一格式归一化为OCSF的调研.md` — OCSF 标准规范参考
- OCSF Schema GitHub (ocsf/ocsf-schema) — category_uid / class_uid 定义

### Tertiary (LOW confidence)
- 国产安全设备 OCSF 映射 — 暂无实际接入需求，待 Phase 17 验证

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 仅使用已有 Pydantic + DSPy，无新库
- Architecture: HIGH — 基于已有 ingestion_models.py 扩展，模式清晰
- Pitfalls: MEDIUM — 基于领域通用知识，项目特定验证有限

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days for stable domain)

---

## Runtime State Inventory

> Phase 16 不涉及 rename/refactor/migration，是纯新增功能（数据模型 + 组件）。无运行时状态需要迁移。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 16 是新增数据模型，不涉及现有数据变更 | None |
| Live service config | None — metadata 配置存储在模板中，未注册到外部服务 | None |
| OS-registered state | None — 无系统级注册 | None |
| Secrets/env vars | None — metadata 字段不涉及 secrets | None |
| Build artifacts | None — 纯 Python 库扩展，无构建产物 | None |
