"""
攻击链服务

提供攻击链的 CRUD 操作
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from ...graph.client import Neo4jClient
from .models import AttackChainModel, AttackChainCreate, AlertModel


class AttackChainService:
    """
    攻击链服务

    负责:
    1. 将关联的告警构建为攻击链
    2. 将攻击链写入 Neo4j
    3. 提供攻击链查询接口
    """

    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.neo4j = neo4j_client or Neo4jClient()

    def close(self):
        """关闭资源"""
        self.neo4j.close()

    def build_chain_from_correlation(
        self,
        correlated_group: Dict[str, Any],
        alerts: List[Dict[str, Any]]
    ) -> AttackChainModel:
        """
        从关联组构建攻击链模型

        Args:
            correlated_group: 关联组数据
            alerts: 告警列表

        Returns:
            AttackChainModel
        """
        # 计算时间范围
        timestamps = [a.get("timestamp") or a.get("_timestamp", 0) for a in alerts]
        if not timestamps:
            timestamps = [datetime.now().timestamp()]

        # 解析时间戳
        parsed_times = []
        for ts in timestamps:
            if isinstance(ts, str):
                from dateutil.parser import parse
                parsed_times.append(parse(ts).timestamp())
            else:
                parsed_times.append(float(ts))

        start_time = min(parsed_times)
        end_time = max(parsed_times)

        # 计算最大严重度
        severities = [a.get("severity", 0) for a in alerts]
        max_severity = max(severities) if severities else 0

        # 获取目标资产 IP
        asset_ips = [a.get("dst_ip") for a in alerts if a.get("dst_ip")]
        asset_ip = asset_ips[0] if asset_ips else None

        # 构建告警模型列表
        alert_models = []
        for a in alerts:
            alert_models.append(AlertModel(
                alert_id=a.get("event_id", str(uuid.uuid4())),
                timestamp=a.get("timestamp"),
                src_ip=a.get("src_ip"),
                dst_ip=a.get("dst_ip"),
                event_type=a.get("event_type"),
                severity=a.get("severity", 0),
                alert_signature=a.get("alert_signature"),
                mitre_tactic=a.get("mitre_tactic"),
                mitre_technique_id=a.get("mitre_technique_id"),
                mitre_technique_name=a.get("mitre_technique_name")
            ))

        return AttackChainModel(
            chain_id=correlated_group.get("group_id", str(uuid.uuid4())),
            start_time=datetime.fromtimestamp(start_time).isoformat(),
            end_time=datetime.fromtimestamp(end_time).isoformat(),
            alert_count=len(alerts),
            max_severity=max_severity,
            status="active",
            asset_ip=asset_ip,
            alerts=alert_models
        )

    def save_chain(self, chain: AttackChainModel) -> str:
        """
        保存攻击链到 Neo4j

        Args:
            chain: 攻击链模型

        Returns:
            chain_id
        """
        chain_data = {
            "chain_id": chain.chain_id,
            "start_time": chain.start_time,
            "end_time": chain.end_time,
            "alert_count": chain.alert_count,
            "max_severity": chain.max_severity,
            "status": chain.status,
            "asset_ip": chain.asset_ip,
            "alert_ids": [a.alert_id for a in chain.alerts]
        }

        # 先写入各告警节点
        for alert_model in chain.alerts:
            alert_dict = alert_model.model_dump()
            self.neo4j.write_alert(alert_dict)

        # 再创建攻击链节点
        return self.neo4j.create_attack_chain(chain_data)

    def get_chain(self, chain_id: str) -> Optional[AttackChainModel]:
        """
        获取攻击链详情

        Args:
            chain_id: 攻击链 ID

        Returns:
            AttackChainModel 或 None
        """
        chain_data = self.neo4j.get_chain_by_id(chain_id)
        if not chain_data:
            return None

        # 转换为模型
        alerts = [
            AlertModel(**a) for a in chain_data.get("alerts", [])
        ]

        return AttackChainModel(
            chain_id=chain_data["chain_id"],
            start_time=chain_data.get("start_time"),
            end_time=chain_data.get("end_time"),
            alert_count=chain_data.get("alert_count", 0),
            max_severity=chain_data.get("max_severity", 0),
            status=chain_data.get("status", "unknown"),
            asset_ip=chain_data.get("asset_ip"),
            alerts=alerts
        )

    def list_chains(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        列出攻击链 (分页)

        Args:
            limit: 返回数量
            offset: 偏移量
            status: 过滤状态

        Returns:
            {chains: [...], total: N, limit, offset}
        """
        chains_data = self.neo4j.list_chains(limit=limit, offset=offset, status=status)

        chains = []
        for c in chains_data:
            chains.append(AttackChainModel(
                chain_id=c["chain_id"],
                start_time=c.get("start_time"),
                end_time=c.get("end_time"),
                alert_count=c.get("alert_count", 0),
                max_severity=c.get("max_severity", 0),
                status=c.get("status", "unknown"),
                asset_ip=c.get("asset_ip"),
                alerts=[]
            ))

        return {
            "chains": chains,
            "total": len(chains),
            "limit": limit,
            "offset": offset
        }

    def reconstruct_from_correlator(
        self,
        correlator,
        neo4j_client: Optional[Neo4jClient] = None
    ) -> List[str]:
        """
        从关联器重建所有攻击链并存储到 Neo4j

        Args:
            correlator: AlertCorrelator 实例
            neo4j_client: Neo4j 客户端

        Returns:
            新创建的攻击链 ID 列表
        """
        if neo4j_client:
            self.neo4j = neo4j_client

        chain_ids = []
        groups = correlator.get_groups()

        for src_ip, alerts in groups.items():
            if len(alerts) < 2:
                continue

            # 构建关联组
            correlated_group = {
                "group_id": f"chain_{src_ip}_{alerts[0]['event_id'][:8]}",
                "correlation_type": "ip"
            }

            # 构建攻击链
            chain = self.build_chain_from_correlation(correlated_group, alerts)

            # 保存
            chain_id = self.save_chain(chain)
            chain_ids.append(chain_id)

        return chain_ids
