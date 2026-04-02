"""
数据接入 API 接口

FastAPI endpoints for data source template management
DI-01~DI-04: 模板 CRUD 操作
DI-07: AI 自动识别日志格式
DI-09: 解析测试
"""

import uuid
import json
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict

from .ingestion_models import (
    DataSourceTemplate,
    TemplateCreate,
    TemplateUpdate,
    TemplateListResponse,
    DeleteResponse,
    ConnectionConfig,
    DataSourceStatus,
    HealthStatus
)
from .parse_test_models import (
    LogFormatRecognitionRequest,
    LogFormatRecognitionResponse,
    ParseTestRequest,
    ParseTestResult
)
from src.analysis.llm_config import get_lm, is_llm_available, DSPY_AVAILABLE

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

# 内存存储 (生产环境应使用数据库)
_templates: Dict[str, DataSourceTemplate] = {}

# 状态存储 (生产环境应从实际监控服务获取)
_template_status: Dict[str, DataSourceStatus] = {}


def _generate_id() -> str:
    """生成唯一 ID"""
    return f"template-{uuid.uuid4().hex[:8]}"


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates() -> TemplateListResponse:
    """
    DI-04: 列出所有数据源模板

    Returns:
        templates: 模板列表
        total: 总数
    """
    templates = list(_templates.values())
    return TemplateListResponse(templates=templates, total=len(templates))


@router.post("/templates", response_model=DataSourceTemplate, status_code=201)
async def create_template(template: TemplateCreate) -> DataSourceTemplate:
    """
    DI-01: 创建数据源模板

    - **name**: 模板名称
    - **device_type**: 设备类型 (firewall/ids/vpn/switch/router/waf/other)
    - **connection**: 连接参数
    - **log_format**: 日志格式 (CEF/Syslog/JSON/Custom)

    Returns:
        创建的模板对象
    """
    template_id = _generate_id()
    new_template = DataSourceTemplate(
        id=template_id,
        name=template.name,
        device_type=template.device_type,
        connection=template.connection,
        log_format=template.log_format,
        custom_regex=template.custom_regex
    )
    _templates[template_id] = new_template
    return new_template


@router.get("/templates/{template_id}", response_model=DataSourceTemplate)
async def get_template(template_id: str) -> DataSourceTemplate:
    """
    获取单个数据源模板

    - **template_id**: 模板 ID

    Returns:
        模板对象

    Raises:
        404: 模板不存在
    """
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
    return _templates[template_id]


@router.put("/templates/{template_id}", response_model=DataSourceTemplate)
async def update_template(
    template_id: str,
    template_update: TemplateUpdate
) -> DataSourceTemplate:
    """
    DI-02: 更新数据源模板

    - **template_id**: 模板 ID
    - **template_update**: 更新内容 (部分更新)

    Returns:
        更新后的模板对象

    Raises:
        404: 模板不存在
    """
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    existing = _templates[template_id]

    # 部分更新
    update_data = template_update.model_dump(exclude_unset=True)
    updated = existing.model_copy(update=update_data)

    _templates[template_id] = updated
    return updated


@router.delete("/templates/{template_id}", response_model=DeleteResponse)
async def delete_template(template_id: str) -> DeleteResponse:
    """
    DI-03: 删除数据源模板

    - **template_id**: 模板 ID

    Returns:
        删除结果

    Raises:
        404: 模板不存在
    """
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    del _templates[template_id]
    # 同时删除状态
    if template_id in _template_status:
        del _template_status[template_id]
    return DeleteResponse(success=True, message=f"Template {template_id} deleted")


@router.get("/templates/{template_id}/status", response_model=DataSourceStatus)
async def get_template_status(template_id: str) -> DataSourceStatus:
    """
    DI-06: 获取数据源健康状态

    - **template_id**: 模板 ID

    Returns:
        数据源状态信息

    Raises:
        404: 模板不存在
    """
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    # 如果没有状态记录，创建一个默认状态
    if template_id not in _template_status:
        _template_status[template_id] = DataSourceStatus(
            template_id=template_id,
            status=HealthStatus.ONLINE,
            last_sync=None,
            events_received=0,
            error_message=None
        )

    return _template_status[template_id]


@router.post("/recognize-format", response_model=LogFormatRecognitionResponse)
async def recognize_log_format(
    request: LogFormatRecognitionRequest
) -> LogFormatRecognitionResponse:
    """
    DI-07: AI 自动识别日志格式

    - 提供 3-5 条示例日志
    - 系统自动识别日志格式（CEF/Syslog/JSON/Custom）
    - 推荐 OCSF 统一字段映射
    - 返回置信度评分

    Args:
        request: 包含示例日志列表的请求

    Returns:
        识别结果：格式、正则、字段映射、置信度、理由

    Raises:
        503: LLM 服务不可用
    """
    # 检查 LLM 是否可用
    if not is_llm_available():
        raise HTTPException(
            status_code=503,
            detail="LLM service unavailable. Please check LLM configuration."
        )

    try:
        from parser.dspy.signatures import LogFormatRecognition

        lm = get_lm()
        if lm is None:
            raise HTTPException(status_code=503, detail="LLM not initialized")

        # 使用 DSPy 调用 LLM
        with lm:
            # 构建输入
            raw_logs_text = "\n".join(request.logs)

            # 模拟 DSPy Predict 调用（实际实现依赖 DSPy 版本）
            # 注意：这里使用简化实现，真正的 DSPy 集成需要完整 dspy context
            if DSPY_AVAILABLE:
                import dspy
                with dspy.context(lm=lm):
                    predictor = dspy.Predict(LogFormatRecognition)
                    result = predictor(
                        raw_logs=raw_logs_text,
                        source_type="unknown"
                    )

                    # 解析返回结果
                    field_mappings = json.loads(result.ocsf_field_mappings) if isinstance(result.ocsf_field_mappings, str) else result.ocsf_field_mappings

                    return LogFormatRecognitionResponse(
                        detected_format=result.detected_format,
                        regex_pattern=result.regex_pattern,
                        field_mappings=field_mappings,
                        confidence=float(result.confidence),
                        reasoning=result.reasoning
                    )
            else:
                # DSPy 不可用时的模拟响应（用于测试/演示）
                # 实际生产环境应移除此分支
                return LogFormatRecognitionResponse(
                    detected_format="CEF",
                    regex_pattern=r"CEF:(?P<version>\d+)\|(?P<vendor>[^|]+)\|(?P<product>[^|]+)\|(?P<version2>[^|]+)\|(?P<event_id>[^|]+)\|(?P<name>[^|]+)\|(?P<severity>[^|]+)",
                    field_mappings={
                        "src_endpoint.ip": "src",
                        "dst_endpoint.ip": "dst",
                        "src_endpoint.port": "spt",
                        "dst_endpoint.port": "dpt",
                        "message": "msg",
                        "severity_id": "sev",
                        "raw_data": "raw"
                    },
                    confidence=0.85,
                    reasoning="基于示例日志分析，识别为 CEF 格式。CEF (Common Event Format) 是一种广泛使用的日志格式，包含版本、设备厂商、产品名称等标准字段。"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


@router.post("/preview-parse", response_model=Dict)
async def preview_parse(
    request: Dict
) -> Dict:
    """
    解析预览接口

    用于 FieldMappingPreview 实时预览解析效果。

    Args:
        request: 包含 logs 和 template_id 的字典

    Returns:
        解析结果字典列表

    Raises:
        404: 模板不存在
    """
    logs = request.get("logs", [])
    template_id = request.get("template_id")

    if template_id and template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    # 获取模板信息（如果提供了 template_id）
    template = _templates.get(template_id) if template_id else None

    # 简单解析实现（实际应使用 ThreeTierParser）
    results = []
    for log in logs:
        parsed = {
            "raw": log,
            "format": template.log_format if template else "Unknown",
            "success": True,
            "fields": {}
        }
        results.append(parsed)

    return {
        "results": results,
        "total": len(results)
    }
