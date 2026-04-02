"""DSPy signatures for log parsing.

提供 LLM 驱动的日志格式识别和 OCSF 归一化 Signature 定义。
支持 DSPy 可用性检测，Python 3.8 兼容（无运行时 DSPy 依赖时使用存根）。
"""

# DSPy 可用性检测
DSPY_AVAILABLE = False
try:
    import dspy
    if hasattr(dspy, 'Signature') and hasattr(dspy, 'Module'):
        DSPY_AVAILABLE = True
        # 实际导入 DSPy 组件
        from dspy import InputField, OutputField, Signature
except ImportError:
    dspy = None
    # DSPy 不可用时，定义存根类（类型注解用途）
    class _StubField:
        """DSPy InputField/OutputField 的存根实现。"""
        def __init__(self, desc: str = ""):
            self.desc = desc

    def InputField(desc: str = ""):
        """InputField 存根。"""
        return _StubField(desc=desc)

    def OutputField(desc: str = ""):
        """OutputField 存根。"""
        return _StubField(desc=desc)

    # 创建一个假的 Signature 类作为基类
    class Signature:
        """Signature 存根，仅用于类型注解。"""
        pass


if DSPY_AVAILABLE:
    class LogFormatRecognition(Signature):
        """识别日志格式并归一化到 OCSF (Open Cybersecurity Schema Framework)。

        输入:
            raw_logs: 3-5条原始日志示例，每条一行
            source_type: 数据源类型描述，如 firewall、suricata

        输出:
            detected_format: 检测到的格式：CEF/Syslog/JSON/Custom
            regex_pattern: Python 正则表达式，包含命名捕获组
            ocsf_field_mappings: OCSF 归一化字段映射 JSON 字符串
                格式: {"src_endpoint.ip": "src", "dst_endpoint.ip": "dst", ...}
            category_uid: OCSF Category UID (2: Findings / 1: System / 4: Network)
            class_uid: OCSF Class UID (2001: Security Finding / 4001: Network Activity)
            confidence: 置信度 0.0-1.0
            reasoning: 识别理由和 OCSF 归一化说明
        """

        raw_logs = InputField(desc="3-5条原始日志示例，每条一行")
        source_type = InputField(desc="数据源类型描述，如 firewall、suricata")

        detected_format = OutputField(desc="检测到的格式：CEF/Syslog/JSON/Custom")
        regex_pattern = OutputField(desc="Python 正则表达式，包含命名捕获组")
        ocsf_field_mappings = OutputField(
            desc='OCSF 归一化字段映射 JSON，如 {"src_endpoint.ip": "src", "dst_endpoint.ip": "dst", "severity_id": "sev", "time": "timestamp"}'
        )
        detected_fields = OutputField(
            desc='检测到的源字段列表 JSON，如 ["src", "dst", "spt", "dpt"]'
        )
        category_uid = OutputField(desc="OCSF Category UID: 2 (Findings) / 1 (System) / 4 (Network)")
        class_uid = OutputField(desc="OCSF Class UID: 2001 (Security Finding) / 4001 (Network Activity)")
        confidence = OutputField(desc="置信度 0.0-1.0")
        reasoning = OutputField(desc="识别理由和 OCSF 归一化说明")

else:
    # DSPy 不可用时的存根实现（类型注解）
    class LogFormatRecognition:
        """识别日志格式并归一化到 OCSF。

        注意: DSPy 不可用，这是存根实现。
        实际功能需要安装 dspy>=2.0.0。
        """

        raw_logs: str
        source_type: str

        detected_format: str
        regex_pattern: str
        ocsf_field_mappings: str  # JSON 字符串
        detected_fields: str  # JSON 字符串
        category_uid: int
        class_uid: int
        confidence: float
        reasoning: str
