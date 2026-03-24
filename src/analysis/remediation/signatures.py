"""DSPy 签名 - 处置建议生成

定义处置建议生成的输入输出字段
Per D-01: LLM 兜底生成处置建议
"""

# 检测 dspy-ai 是否真正可用
DSPY_AVAILABLE = False
try:
    import dspy
    if hasattr(dspy, 'Signature') and hasattr(dspy, 'Module'):
        DSPY_AVAILABLE = True
except ImportError:
    dspy = None


if DSPY_AVAILABLE:
    class RemediationRecommendationSignature(dspy.Signature):
        """处置建议生成签名

        输入：攻击链数据 + ATT&CK 技术信息 + 资产上下文
        输出：一行核心行动 + 详细步骤 + ATT&CK 引用

        规则 (per D-02, D-03):
        - short_action: 通俗行动描述，必须包含具体资产信息
        - detailed_steps: 3-5 步详细处置步骤
        - attck_ref: ATT&CK 技术引用
        """
        chain_data = dspy.InputField(
            desc="攻击链完整数据，包含告警列表、源IP、目标IP、端口等"
        )
        technique_id = dspy.InputField(
            desc="ATT&CK technique ID，如 T1190"
        )
        asset_context = dspy.InputField(
            desc="资产上下文，包含 IP、主机名、端口等服务信息"
        )

        short_action = dspy.OutputField(
            desc="一行核心行动建议，必须包含具体资产信息，如：阻断 192.168.1.100 的 445 端口访问"
        )
        detailed_steps = dspy.OutputField(
            desc="详细处置步骤列表，每步一行，最多 5 步"
        )
        attck_ref = dspy.OutputField(
            desc="ATT&CK 技术引用，格式：T1190 - Exploit Public-Facing Application"
        )
else:
    # Stub 实现
    class _Field:
        def __init__(self, desc: str = ""):
            self.desc = desc

    def InputField(desc: str = ""):
        return _Field(desc=desc)

    def OutputField(desc: str = ""):
        return _Field(desc=desc)

    class RemediationRecommendationSignature:
        """处置建议生成签名 - Stub 实现"""
        chain_data = InputField(desc="攻击链完整数据")
        technique_id = InputField(desc="ATT&CK technique ID")
        asset_context = InputField(desc="资产上下文")
        short_action = OutputField(desc="一行核心行动建议")
        detailed_steps = OutputField(desc="详细处置步骤列表")
        attck_ref = OutputField(desc="ATT&CK 技术引用")
