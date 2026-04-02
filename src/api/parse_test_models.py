"""解析测试 Pydantic 模型

定义解析测试请求和响应的数据结构
用于 DI-09 解析测试功能
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class ParseTestRequest(BaseModel):
    """解析测试请求"""
    template_id: str = Field(..., description="模板 ID")
    test_logs: List[str] = Field(..., min_length=1, max_length=1000,
                                  description="测试日志列表")
    ground_truth: Optional[List[Dict]] = Field(None,
                                                 description="ground truth 标注，用于计算准确率")


class FieldAccuracy(BaseModel):
    """字段级别准确率"""
    field_name: str
    correct: int
    total: int
    accuracy: float


class ParseTestResult(BaseModel):
    """解析测试结果"""
    total_logs: int
    success_count: int
    failure_count: int
    overall_accuracy: float
    field_accuracies: List[FieldAccuracy] = Field(default_factory=list,
                                                   description="字段级准确率")
    failed_samples: List[Dict] = Field(default_factory=list,
                                         description="失败样例")
    is_qualified: bool = Field(...,
                               description="是否达标 (准确率 >= 阈值)")


class LogFormatRecognitionRequest(BaseModel):
    """日志格式识别请求 (DI-07)"""
    logs: List[str] = Field(..., min_length=1, max_length=10,
                             description="3-5条示例日志")


class LogFormatRecognitionResponse(BaseModel):
    """日志格式识别响应 (DI-07)"""
    detected_format: str = Field(..., description="检测到的格式：CEF/Syslog/JSON/Custom")
    regex_pattern: str = Field(..., description="Python 正则表达式，包含命名捕获组")
    field_mappings: Dict[str, str] = Field(..., description="字段映射 {sourceField: OCSFField} - 统一方向")
    detected_fields: List[str] = Field(default_factory=list, description="检测到的源字段列表")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度 0.0-1.0")
    reasoning: str = Field(..., description="识别理由")
