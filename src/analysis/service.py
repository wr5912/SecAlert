"""SecAlert 分析服务

对攻击链进行分类、抑制和严重度标注
Phase 3 核心服务
"""

import logging
from typing import Dict, Any, Optional, List

from src.graph.client import Neo4jClient
from src.chain.attack_chain.models import AttackChainModel
from .classifier.programs import ChainClassifierProgram
from .classifier.rules import ClassificationRules
from .classifier.severity import calculate_severity


logger = logging.getLogger(__name__)


class AnalysisService:
    """SecAlert 分析服务

    职责：
    1. 从 Neo4j 读取攻击链
    2. 调用分类器进行分类
    3. 根据分类结果更新链状态（抑制/放行）
    4. 标注严重度

    软删除策略（per D-05）：
    - 误报链标记为 false_positive，不物理删除
    - 支持恢复操作
    """

    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.neo4j = neo4j_client or Neo4jClient()
        self.classifier = ChainClassifierProgram()
        self.rules = ClassificationRules()

    def classify_chain(self, chain_id: str) -> Dict[str, Any]:
        """对单条攻击链进行分类

        Args:
            chain_id: 攻击链 ID

        Returns:
            分类结果，包含：
            - chain_id
            - is_real_threat
            - confidence
            - severity
            - reasoning
            - should_suppress
            - suppression_reason
        """
        # 1. 从 Neo4j 读取链数据
        chain_data = self.neo4j.get_chain_by_id(chain_id)
        if not chain_data:
            return {"error": f"Chain {chain_id} not found"}

        # 2. 规则优先检查
        rule_result = self.rules.check(chain_data)

        # 3. DSPy 分类（带阈值）
        classification = self.classifier.classify_with_threshold(
            chain_data=chain_data,
            rule_result=rule_result,
            threat_intel={}
        )

        # 4. 根据分类结果更新状态
        if classification["should_suppress"]:
            self._suppress_chain(chain_id, classification)
        else:
            self._flag_real_attack(chain_id, classification)

        # 5. 持久化分类详情 (IG-05)
        self.neo4j.update_classification(chain_id, classification)

        # 5. 计算严重度（如果真实攻击）
        severity = classification["severity"]
        if not classification["should_suppress"] and chain_data.get("alerts"):
            # 从告警中提取 technique_id 计算严重度
            technique_ids = [
                alert.get("mitre_technique_id")
                for alert in chain_data["alerts"]
                if alert.get("mitre_technique_id")
            ]
            if technique_ids:
                severity = calculate_severity(technique_ids[0], {})
                self._update_severity(chain_id, severity)

        return {
            "chain_id": chain_id,
            "is_real_threat": classification["is_real_threat"],
            "confidence": classification["confidence"],
            "severity": severity,
            "reasoning": classification["reasoning"],
            "should_suppress": classification["should_suppress"],
            "suppression_reason": classification.get("suppression_reason"),
            "rule_matched": rule_result is not None
        }

    def _suppress_chain(self, chain_id: str, classification: Dict[str, Any]) -> None:
        """抑制误报攻击链（软删除）"""
        success = self.neo4j.update_chain_status(chain_id, "false_positive")
        if success:
            logger.info(
                f"Chain {chain_id} suppressed as false positive. "
                f"Confidence={classification['confidence']:.2f}, "
                f"Reason={classification.get('suppression_reason', 'threshold')}"
            )
        else:
            logger.error(f"Failed to suppress chain {chain_id}")

    def _flag_real_attack(self, chain_id: str, classification: Dict[str, Any]) -> None:
        """标记真实攻击"""
        success = self.neo4j.update_chain_status(chain_id, "active")
        if success:
            logger.warning(
                f"Chain {chain_id} flagged as real attack. "
                f"Severity={classification['severity']}, "
                f"Confidence={classification['confidence']:.2f}"
            )
        else:
            logger.error(f"Failed to flag chain {chain_id}")

    def _update_severity(self, chain_id: str, severity: str) -> None:
        """更新链的严重度标签"""
        # IG-03: 通过 update_classification 持久化严重度标签
        self.neo4j.update_classification(chain_id, {
            "is_real_threat": True,
            "confidence": 1.0,
            "severity": severity,
            "reasoning": f"Severity updated to {severity}",
            "should_suppress": False,
            "rule_matched": False
        })

    def restore_chain(self, chain_id: str) -> Dict[str, Any]:
        """恢复被误判的误报链

        Args:
            chain_id: 攻击链 ID

        Returns:
            恢复结果
        """
        chain_data = self.neo4j.get_chain_by_id(chain_id)
        if not chain_data:
            return {"error": f"Chain {chain_id} not found"}

        if chain_data.get("status") != "false_positive":
            return {"error": f"Chain {chain_id} is not a false positive"}

        success = self.neo4j.update_chain_status(chain_id, "active")
        if success:
            logger.info(f"Chain {chain_id} restored from false positive")
            return {"chain_id": chain_id, "status": "active", "restored": True}
        else:
            return {"error": f"Failed to restore chain {chain_id}"}

    def list_false_positives(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """获取误报链列表（供人工审核）

        Returns:
            误报链列表
        """
        return self.neo4j.list_chains(
            limit=limit,
            offset=offset,
            status="false_positive"
        )

    def batch_classify(self, chain_ids: List[str]) -> List[Dict[str, Any]]:
        """批量分类攻击链

        Args:
            chain_ids: 攻击链 ID 列表

        Returns:
            分类结果列表
        """
        results = []
        for chain_id in chain_ids:
            try:
                result = self.classify_chain(chain_id)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to classify chain {chain_id}: {e}")
                results.append({"chain_id": chain_id, "error": str(e)})
        return results
