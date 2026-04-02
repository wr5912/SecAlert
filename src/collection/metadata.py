"""
采集元数据注入模块

GM-01: MetadataEnricher 组件 - Ingestion Gateway 统一注入
GM-02: OCSFMapper 组件 - 规则推断 + AI 兜底的 OCSF 映射
"""

import json
from datetime import datetime, timezone
from typing import Optional, Tuple
from dataclasses import dataclass

from src.api.ingestion_models import CollectionMetadata, DeviceType, Environment


@dataclass
class OCSFMappingResult:
    """OCSF 映射结果"""
    category_uid: int
    class_uid: int
    confidence: float  # 0.0-1.0
    source: str  # "rule" or "ai"


class MetadataEnricher:
    """全局元数据强制注入器（GM-01）"""

    def __init__(self, metadata: CollectionMetadata, collector_id: str):
        self.metadata = metadata
        self.collector_id = collector_id

    def enrich(self, event: dict) -> dict:
        """将元数据注入事件 payload（注入到 _collection_metadata 子对象，不污染顶层字段）"""
        enriched = event.copy()
        enriched["_collection_metadata"] = {
            "vendor_name": self.metadata.vendor_name,
            "product_name": self.metadata.product_name,
            "device_type": self.metadata.device_type.value if isinstance(self.metadata.device_type, DeviceType) else self.metadata.device_type,
            "tenant_id": self.metadata.tenant_id,
            "environment": self.metadata.environment.value if isinstance(self.metadata.environment, Environment) else self.metadata.environment,
            "target_category_uid": self.metadata.target_category_uid,
            "target_class_uid": self.metadata.target_class_uid,
            "collector_id": self.collector_id,
            "ingest_timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return enriched

    def enrich_kafka_message(self, event: dict) -> Tuple[str, str]:
        """返回 (key, value) 用于 Kafka Producer"""
        enriched = self.enrich(event)
        # Partition key: tenant_id_device_type_hash
        device_type_val = self.metadata.device_type.value if isinstance(self.metadata.device_type, DeviceType) else self.metadata.device_type
        key = f"{self.metadata.tenant_id}_{device_type_val}_{hash(json.dumps(event, sort_keys=True))}"
        return key, json.dumps(enriched)


class OCSFMapper:
    """OCSF 目标映射器（GM-02）- 规则推断优先 + AI 兜底"""

    # 规则表: (device_type, log_format) -> (category_uid, class_uid)
    # 参考 OCSF Schema: category_uid=1(Network Activity), 2(Detective Control), 6(Entity)
    DEVICE_TYPE_RULES: dict[Tuple[str, str], Tuple[int, int]] = {
        # IDS/IPS
        ("ids", "JSON"): (1, 2001),        # Network Activity / Alert
        ("ids", "CEF"): (1, 2001),
        ("ids", "SYSLOG"): (1, 2001),
        ("ips", "JSON"): (1, 2001),
        ("ips", "CEF"): (1, 2001),
        # Firewall
        ("firewall", "CEF"): (1, 4001),    # Network Activity / Network Activity
        ("firewall", "SYSLOG"): (1, 4001),
        ("firewall", "JSON"): (1, 4001),
        # WAF
        ("waf", "CEF"): (1, 4001),
        ("waf", "JSON"): (1, 4001),
        # EDR
        ("edr", "JSON"): (2, 2001),        # Detective Control / Security Finding
        # Antivirus
        ("antivirus", "JSON"): (2, 2003),  # File Activity
        # VPN
        ("vpn", "SYSLOG"): (6, 6001),       # Entity / Authentication
        ("vpn", "CEF"): (6, 6001),
        # Switch/Router
        ("switch", "SYSLOG"): (1, 4001),
        ("router", "SYSLOG"): (1, 4001),
        # SIEM
        ("siem", "JSON"): (2, 2001),
    }

    # 置信度阈值：低于此值触发 AI 推断（目前未启用 AI 兜底，先用规则）
    CONFIDENCE_THRESHOLD = 0.7

    # 未知设备的默认值（低置信度）
    DEFAULT_CATEGORY = 1   # Network Activity
    DEFAULT_CLASS = 4001  # Network Activity

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
            category_uid=cls.DEFAULT_CATEGORY,
            class_uid=cls.DEFAULT_CLASS,
            confidence=0.5,
            source="rule"
        )

    @classmethod
    def validate_ocsf_uid(cls, category_uid: Optional[int], class_uid: Optional[int]) -> Tuple[bool, str]:
        """校验 OCSF UID 格式合规性"""
        if category_uid is None or class_uid is None:
            return True, ""  # Optional 字段，空值不校验

        # OCSF category_uid 有效范围: 1-999
        if not (1 <= category_uid <= 999):
            return False, f"Invalid category_uid: {category_uid} (must be 1-999)"

        # OCSF class_uid 有效范围: 1000-9999
        if not (1000 <= class_uid <= 9999):
            return False, f"Invalid class_uid: {class_uid} (must be 1000-9999)"

        return True, ""
