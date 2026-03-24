"""处置建议模板管理

加载和匹配 ATT&CK Technique 处置建议模板
Per D-01: 规则模板优先策略
"""

import yaml
from pathlib import Path
from typing import Dict, Any, Optional

# 默认模板库路径
DEFAULT_TEMPLATE_FILE = "rules/remediation_templates.yaml"


class RemediationTemplates:
    """处置建议模板管理器"""

    def __init__(self, template_file: str = DEFAULT_TEMPLATE_FILE):
        self.template_file = template_file
        self.templates: Dict[str, Dict[str, Any]] = {}
        self._load_templates()

    def _load_templates(self) -> None:
        """从 YAML 文件加载模板"""
        try:
            template_path = Path(self.template_file)
            if template_path.exists():
                with open(template_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    self.templates = data.get("templates", {})
        except Exception as e:
            # 模板加载失败，使用空模板
            self.templates = {}

    def get_template(self, technique_id: str) -> Optional[Dict[str, Any]]:
        """根据 technique_id 获取模板

        Args:
            technique_id: ATT&CK technique ID，如 T1190

        Returns:
            模板字典，包含 short_action, detailed_steps, attck_ref
        """
        return self.templates.get(technique_id)

    def apply_template(
        self,
        template: Dict[str, Any],
        chain_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """应用模板并填充具体资产信息

        Args:
            template: 模板字典
            chain_data: 攻击链数据

        Returns:
            填充后的处置建议
        """
        # 提取资产信息
        src_ip = "未知"
        dst_ip = "未知"
        port = "未知"

        if chain_data.get("alerts"):
            first_alert = chain_data["alerts"][0]
            src_ip = first_alert.get("src_ip") or src_ip
            # 尝试从任何告警中提取目标 IP
            for alert in chain_data["alerts"]:
                if alert.get("dst_ip"):
                    dst_ip = alert.get("dst_ip")
                    break

        # 提取端口信息
        for alert in chain_data.get("alerts", []):
            if alert.get("port"):
                port = alert.get("port")
                break

        # 从 chain_data 本身提取 asset_ip
        if chain_data.get("asset_ip"):
            dst_ip = chain_data.get("asset_ip")

        # 填充 short_action
        short_action = template.get("short_action", "").format(
            src_ip=src_ip,
            dst_ip=dst_ip,
            port=port
        )

        # 填充 detailed_steps
        filled_steps = []
        for step in template.get("detailed_steps", []):
            try:
                filled_step = step.format(
                    src_ip=src_ip,
                    dst_ip=dst_ip,
                    port=port
                )
                filled_steps.append(filled_step)
            except KeyError:
                # 模板中的占位符可能与传入参数不匹配，原样保留
                filled_steps.append(step)

        return {
            "short_action": short_action,
            "detailed_steps": filled_steps,
            "attck_ref": template.get("attck_ref"),
            "source": "template"
        }

    def has_template(self, technique_id: str) -> bool:
        """检查是否有指定 technique 的模板"""
        return technique_id in self.templates
