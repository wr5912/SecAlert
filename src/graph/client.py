"""
Neo4j 客户端封装

提供攻击链图数据的读写接口
"""

import os
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass

try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None


@dataclass
class Neo4jConfig:
    """Neo4j 连接配置"""
    uri: str = "bolt://localhost:7687"
    username: str = "neo4j"
    password: str = "neo4j_dev"


class Neo4jClient:
    """
    Neo4j 客户端封装

    用于攻击链图数据的读写
    """

    def __init__(self, config: Optional[Neo4jConfig] = None):
        if config is None:
            config = Neo4jConfig(
                uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
                username=os.getenv("NEO4J_USERNAME", "neo4j"),
                password=os.getenv("NEO4J_PASSWORD", "neo4j")
            )
        self.config = config
        self.driver = None
        if GraphDatabase:
            self.driver = GraphDatabase.driver(
                config.uri,
                auth=(config.username, config.password)
            )

    def close(self):
        """关闭连接"""
        if self.driver:
            self.driver.close()

    def ensure_constraints(self) -> None:
        """确保必要的约束和索引存在"""
        if not self.driver:
            return

        with self.driver.session() as session:
            # 创建 Alert 节点唯一约束
            session.run("""
                CREATE CONSTRAINT alert_id_unique IF NOT EXISTS
                FOR (a:Alert) REQUIRE a.alert_id IS UNIQUE
            """)
            # 创建 AttackChain 节点唯一约束
            session.run("""
                CREATE CONSTRAINT chain_id_unique IF NOT EXISTS
                FOR (c:AttackChain) REQUIRE c.chain_id IS UNIQUE
            """)
            # 创建索引
            session.run("""
                CREATE INDEX src_ip_index IF NOT EXISTS
                FOR (a:Alert) ON (a.src_ip)
            """)
            session.run("""
                CREATE INDEX timestamp_index IF NOT EXISTS
                FOR (a:Alert) ON (a.timestamp)
            """)
            session.run("""
                CREATE INDEX chain_start_time_index IF NOT EXISTS
                FOR (c:AttackChain) ON (c.start_time)
            """)

    def write_alert(self, alert: Dict[str, Any]) -> str:
        """
        写入单条告警到 Neo4j

        Args:
            alert: OCSF 格式告警

        Returns:
            alert_id
        """
        if not self.driver:
            return alert.get("event_id", str(uuid.uuid4()))

        alert_id = alert.get("event_id", str(uuid.uuid4()))

        with self.driver.session() as session:
            session.run("""
                MERGE (a:Alert {alert_id: $alert_id})
                SET a.timestamp = datetime($timestamp),
                    a.src_ip = $src_ip,
                    a.dst_ip = $dst_ip,
                    a.event_type = $event_type,
                    a.severity = $severity,
                    a.alert_signature = $alert_signature,
                    a.mitre_tactic = $mitre_tactic,
                    a.mitre_technique_id = $mitre_technique_id,
                    a.mitre_technique_name = $mitre_technique_name,
                    a.raw_event = $raw_event
            """,
                alert_id=alert_id,
                timestamp=alert.get("timestamp"),
                src_ip=alert.get("src_ip"),
                dst_ip=alert.get("dst_ip"),
                event_type=alert.get("event_type"),
                severity=alert.get("severity", 0),
                alert_signature=alert.get("alert_signature"),
                mitre_tactic=alert.get("mitre_tactic"),
                mitre_technique_id=alert.get("mitre_technique_id"),
                mitre_technique_name=alert.get("mitre_technique_name"),
                raw_event=str(alert.get("ocsf_event", {}))
            )

        return alert_id

    def create_attack_chain(self, chain_data: Dict[str, Any]) -> str:
        """
        创建攻击链

        Args:
            chain_data: {
                start_time, end_time, alert_count, max_severity,
                status, asset_ip, alert_ids
            }

        Returns:
            chain_id
        """
        if not self.driver:
            return chain_data.get("chain_id", str(uuid.uuid4()))

        chain_id = chain_data.get("chain_id", str(uuid.uuid4()))

        with self.driver.session() as session:
            # 创建 AttackChain 节点
            session.run("""
                MERGE (c:AttackChain {chain_id: $chain_id})
                SET c.start_time = datetime($start_time),
                    c.end_time = datetime($end_time),
                    c.alert_count = $alert_count,
                    c.max_severity = $max_severity,
                    c.severity_label = $severity_label,
                    c.status = $status,
                    c.asset_ip = $asset_ip,
                    c.mitre_tactic = $mitre_tactic,
                    c.mitre_technique_id = $mitre_technique_id,
                    c.mitre_technique_name = $mitre_technique_name,
                    c.created_at = datetime()
            """,
                chain_id=chain_id,
                start_time=chain_data.get("start_time"),
                end_time=chain_data.get("end_time"),
                alert_count=chain_data.get("alert_count", 0),
                max_severity=chain_data.get("max_severity", 0),
                severity_label=chain_data.get("severity_label"),
                status=chain_data.get("status", "active"),
                asset_ip=chain_data.get("asset_ip"),
                mitre_tactic=chain_data.get("mitre_tactic"),
                mitre_technique_id=chain_data.get("mitre_technique_id"),
                mitre_technique_name=chain_data.get("mitre_technique_name")
            )

            # 建立 Alert -> PART_OF -> AttackChain 关系
            for alert_id in chain_data.get("alert_ids", []):
                session.run("""
                    MATCH (a:Alert {alert_id: $alert_id})
                    MATCH (c:AttackChain {chain_id: $chain_id})
                    MERGE (a)-[:PART_OF]->(c)
                """, alert_id=alert_id, chain_id=chain_id)

        return chain_id

    def get_chain_by_id(self, chain_id: str) -> Optional[Dict[str, Any]]:
        """
        根据 chain_id 获取攻击链详情

        Returns:
            攻击链数据，包含关联的告警列表
        """
        if not self.driver:
            return None

        with self.driver.session() as session:
            result = session.run("""
                MATCH (c:AttackChain {chain_id: $chain_id})
                OPTIONAL MATCH (a:Alert)-[:PART_OF]->(c)
                WITH c, collect(a) as alerts
                RETURN c,
                       [a IN alerts | {
                           alert_id: a.alert_id,
                           timestamp: a.timestamp,
                           src_ip: a.src_ip,
                           dst_ip: a.dst_ip,
                           event_type: a.event_type,
                           severity: a.severity,
                           alert_signature: a.alert_signature,
                           mitre_tactic: a.mitre_tactic,
                           mitre_technique_id: a.mitre_technique_id,
                           mitre_technique_name: a.mitre_technique_name
                       }] as alert_list
            """, chain_id=chain_id)

            record = result.single()
            if not record:
                return None

            c = record["c"]
            alert_list = record["alert_list"]

            return {
                "chain_id": c["chain_id"],
                "start_time": str(c["start_time"]) if c.get("start_time") else None,
                "end_time": str(c["end_time"]) if c.get("end_time") else None,
                "alert_count": c.get("alert_count", 0),
                "max_severity": c.get("max_severity", 0),
                "severity_label": c.get("severity_label"),  # IG-03: 字符串严重度
                "status": c.get("status", "unknown"),
                "asset_ip": c.get("asset_ip"),
                # IG-06: ATT&CK 字段
                "mitre_tactic": c.get("mitre_tactic"),
                "mitre_technique_id": c.get("mitre_technique_id"),
                "mitre_technique_name": c.get("mitre_technique_name"),
                "alerts": sorted(alert_list, key=lambda x: x["timestamp"] or "")
            }

    def list_chains(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        列出攻击链 (分页)

        Args:
            limit: 返回数量
            offset: 偏移量
            status: 过滤状态 (active/resolved/false_positive)

        Returns:
            攻击链列表
        """
        if not self.driver:
            return []

        query = """
            MATCH (c:AttackChain)
        """
        if status:
            query += " WHERE c.status = $status"

        query += """
            RETURN c
            ORDER BY c.start_time DESC
            SKIP $offset
            LIMIT $limit
        """

        with self.driver.session() as session:
            result = session.run(query, offset=offset, limit=limit, status=status)

            chains = []
            for record in result:
                c = record["c"]
                chains.append({
                    "chain_id": c["chain_id"],
                    "start_time": str(c["start_time"]) if c.get("start_time") else None,
                    "end_time": str(c["end_time"]) if c.get("end_time") else None,
                    "alert_count": c.get("alert_count", 0),
                    "max_severity": c.get("max_severity", 0),
                    "status": c.get("status", "unknown"),
                    "asset_ip": c.get("asset_ip")
                })

            return chains

    def update_chain_status(self, chain_id: str, status: str) -> bool:
        """
        更新攻击链状态

        Args:
            chain_id: 攻击链 ID
            status: 新状态 (active/resolved/false_positive)

        Returns:
            是否更新成功
        """
        if not self.driver:
            return False

        with self.driver.session() as session:
            result = session.run("""
                MATCH (c:AttackChain {chain_id: $chain_id})
                SET c.status = $status,
                    c.updated_at = datetime()
                RETURN c
            """, chain_id=chain_id, status=status)

            return result.single() is not None

    def update_classification(
        self,
        chain_id: str,
        classification: Dict[str, Any]
    ) -> bool:
        """
        更新攻击链分类结果 (IG-05)

        Args:
            chain_id: 攻击链 ID
            classification: 分类结果 {
                is_real_threat, confidence, severity, reasoning,
                should_suppress, suppression_reason, rule_matched
            }

        Returns:
            是否更新成功
        """
        if not self.driver:
            return False

        with self.driver.session() as session:
            result = session.run("""
                MATCH (c:AttackChain {chain_id: $chain_id})
                SET c.is_real_threat = $is_real_threat,
                    c.confidence = $confidence,
                    c.severity_label = $severity,
                    c.reasoning = $reasoning,
                    c.should_suppress = $should_suppress,
                    c.suppression_reason = $suppression_reason,
                    c.rule_matched = $rule_matched,
                    c.classified_at = datetime()
                RETURN c
            """,
                chain_id=chain_id,
                is_real_threat=classification.get("is_real_threat"),
                confidence=classification.get("confidence", 0.0),
                severity=classification.get("severity"),
                reasoning=classification.get("reasoning"),
                should_suppress=classification.get("should_suppress", False),
                suppression_reason=classification.get("suppression_reason"),
                rule_matched=classification.get("rule_matched", False)
            )

            return result.single() is not None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
