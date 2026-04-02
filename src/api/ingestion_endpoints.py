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
    HealthStatus,
    CollectionMetadata,
)
from .parse_test_models import (
    LogFormatRecognitionRequest,
    LogFormatRecognitionResponse,
    ParseTestRequest,
    ParseTestResult,
    FieldAccuracy
)

# 批量导入模型
from pydantic import BaseModel, Field
from typing import List, Optional


class BatchDevice(BaseModel):
    """批量导入设备信息"""
    name: str = Field(..., description="设备名称")
    device_type: str = Field(..., description="设备类型")
    host: str = Field(..., description="主机地址")
    port: int = Field(default=514, ge=1, le=65535, description="端口号")
    protocol: str = Field(default="ssh", description="连接协议")
    log_format: str = Field(default="Auto", description="日志格式")


class BatchCreateRequest(BaseModel):
    """批量创建模板请求"""
    devices: List[BatchDevice] = Field(..., description="设备列表")
    apply_template_id: Optional[str] = Field(None, description="统一应用的模板ID")


class BatchCreateResult(BaseModel):
    """批量创建单个结果"""
    name: str = Field(..., description="设备名称")
    template_id: Optional[str] = Field(None, description="创建的模板ID")
    status: str = Field(..., description="状态: success/failure")
    error: Optional[str] = Field(None, description="错误信息")


class BatchCreateResponse(BaseModel):
    """批量创建响应"""
    success_count: int = Field(..., description="成功数量")
    failure_count: int = Field(..., description="失败数量")
    results: List[BatchCreateResult] = Field(..., description="每个设备的结果")
from src.analysis.llm_config import get_lm, is_llm_available, DSPY_AVAILABLE

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

# 内存存储 (生产环境应使用数据库)
_templates: Dict[str, DataSourceTemplate] = {}

# 状态存储 (生产环境应从实际监控服务获取)
_template_status: Dict[str, DataSourceStatus] = {}


def _generate_id() -> str:
    """生成唯一 ID"""
    return f"template-{uuid.uuid4().hex[:8]}"


def _get_default_metadata(template_name: str, device_type: str) -> "CollectionMetadata":
    """v1.0 Suricata 模板默认 metadata（D-06 迁移填充）"""
    from src.api.ingestion_models import DeviceType as DT, Environment, CollectionMetadata
    from src.collection.metadata import OCSFMapper

    # Suricata EVE JSON 默认值
    if "suricata" in template_name.lower():
        vendor_name = "Suricata"
        product_name = "EVE JSON"
        device_type_enum = DT.IDS
    elif device_type:
        device_type_lower = device_type.lower()
        if device_type_lower == "ids" or device_type_lower == "ips":
            vendor_name = "unknown"
            product_name = "unknown"
            device_type_enum = DT.IDS
        elif device_type_lower == "firewall":
            vendor_name = "unknown"
            product_name = "unknown"
            device_type_enum = DT.FIREWALL
        elif device_type_lower == "waf":
            vendor_name = "unknown"
            product_name = "unknown"
            device_type_enum = DT.WAF
        else:
            vendor_name = "unknown"
            product_name = "unknown"
            device_type_enum = DT.OTHER
    else:
        vendor_name = "unknown"
        product_name = "unknown"
        device_type_enum = DT.OTHER

    # 自动推断 OCSF
    ocsf_result = OCSFMapper.map(
        device_type=device_type_enum.value,
        log_format="JSON"  # 默认使用 JSON
    )

    return CollectionMetadata(
        vendor_name=vendor_name,
        product_name=product_name,
        device_type=device_type_enum,
        tenant_id="default",
        environment=Environment.PROD,
        target_category_uid=ocsf_result.category_uid,
        target_class_uid=ocsf_result.class_uid,
    )


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
    DI-01: 创建数据源模板（含 metadata 和 OCSF 自动推断）

    - **name**: 模板名称
    - **device_type**: 设备类型 (firewall/ids/vpn/switch/router/waf/other)
    - **connection**: 连接参数
    - **log_format**: 日志格式 (CEF/Syslog/JSON/Custom)
    - **metadata**: 采集元数据（GM-01 强制字段）

    Returns:
        创建的模板对象（含自动推断的 OCSF 映射）
    """
    from src.collection.metadata import OCSFMapper

    template_id = _generate_id()

    # 自动推断 OCSF 映射
    ocsf_result = OCSFMapper.map(
        device_type=template.device_type.value,
        log_format=template.log_format.value
    )

    # 构建 metadata（含 OCSF 推断结果）
    metadata = template.metadata
    metadata.target_category_uid = ocsf_result.category_uid
    metadata.target_class_uid = ocsf_result.class_uid

    new_template = DataSourceTemplate(
        id=template_id,
        name=template.name,
        device_type=template.device_type,
        connection=template.connection,
        log_format=template.log_format,
        custom_regex=template.custom_regex,
        metadata=metadata  # 新增
    )
    _templates[template_id] = new_template
    return new_template


@router.post("/templates/batch", response_model=BatchCreateResponse, status_code=201)
async def batch_create_templates(request: BatchCreateRequest) -> BatchCreateResponse:
    """
    DI-08: 批量创建数据源模板

    - **devices**: 设备列表
    - **apply_template_id**: 统一应用的模板ID（可选）

    Returns:
        批量创建结果：成功数、失败数、每个设备的状态
    """
    results = []
    success_count = 0
    failure_count = 0

    # 如果指定了统一模板，获取模板配置
    base_template = None
    if request.apply_template_id and request.apply_template_id in _templates:
        base_template = _templates[request.apply_template_id]

    for device in request.devices:
        try:
            # 构建连接配置
            connection = ConnectionConfig(
                host=device.host,
                port=device.port,
                username="",  # 批量导入时留空
                password="",  # 批量导入时留空
                protocol=device.protocol
            )

            # 确定日志格式和自定义正则
            log_format = device.log_format
            custom_regex = None

            # 如果指定了统一模板，使用模板的配置
            if base_template:
                log_format = base_template.log_format
                custom_regex = base_template.custom_regex

            # 创建模板
            template_id = _generate_id()
            new_template = DataSourceTemplate(
                id=template_id,
                name=device.name,
                device_type=device.device_type,
                connection=connection,
                log_format=log_format,
                custom_regex=custom_regex
            )
            _templates[template_id] = new_template

            results.append(BatchCreateResult(
                name=device.name,
                template_id=template_id,
                status="success",
                error=None
            ))
            success_count += 1

        except Exception as e:
            results.append(BatchCreateResult(
                name=device.name,
                template_id=None,
                status="failure",
                error=str(e)
            ))
            failure_count += 1

    return BatchCreateResponse(
        success_count=success_count,
        failure_count=failure_count,
        results=results
    )


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
    DI-02: 更新数据源模板（含 metadata 迁移和 OCSF 重算）

    - **template_id**: 模板 ID
    - **template_update**: 更新内容 (部分更新)

    Returns:
        更新后的模板对象

    Raises:
        404: 模板不存在
    """
    from src.collection.metadata import OCSFMapper

    if template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    existing = _templates[template_id]

    # v1.0 迁移：如果模板没有 metadata，自动填充默认值
    if existing.metadata is None:
        existing.metadata = _get_default_metadata(
            template_name=existing.name,
            device_type=existing.device_type
        )

    # 部分更新
    update_data = template_update.model_dump(exclude_unset=True)
    updated = existing.model_copy(update=update_data)

    # model_copy 可能将 metadata 转成 dict，需要转回 CollectionMetadata
    if isinstance(updated.metadata, dict):
        updated.metadata = CollectionMetadata(**updated.metadata)

    # 如果更新涉及 device_type 或 log_format，重新推断 OCSF
    if "device_type" in update_data or "log_format" in update_data:
        device_type_val = updated.device_type.value if hasattr(updated.device_type, 'value') else updated.device_type
        log_format_val = updated.log_format.value if hasattr(updated.log_format, 'value') else updated.log_format
        ocsf_result = OCSFMapper.map(device_type_val, log_format_val)
        updated.metadata.target_category_uid = ocsf_result.category_uid
        updated.metadata.target_class_uid = ocsf_result.class_uid

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

            # 调用 DSPy 进行日志格式识别
            import dspy
            with dspy.context(lm=lm):
                predictor = dspy.Predict(LogFormatRecognition)
                result = predictor(
                    raw_logs=raw_logs_text,
                    source_type="unknown"
                )

                # 解析返回结果
                field_mappings = json.loads(result.ocsf_field_mappings) if isinstance(result.ocsf_field_mappings, str) else result.ocsf_field_mappings

                # 解析 detected_fields
                detected_fields = json.loads(result.detected_fields) if isinstance(result.detected_fields, str) else result.detected_fields

                return LogFormatRecognitionResponse(
                    detected_format=result.detected_format,
                    regex_pattern=result.regex_pattern,
                    field_mappings=field_mappings,
                    detected_fields=detected_fields,
                    confidence=float(result.confidence),
                    reasoning=result.reasoning
                )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


class PreviewParseRequest(BaseModel):
    """解析预览请求"""
    logs: List[str] = Field(..., description="日志列表")
    template_id: str = Field(..., description="模板ID")


@router.post("/preview-parse", response_model=Dict)
async def preview_parse(
    request: PreviewParseRequest,
) -> Dict:
    """
    解析预览接口 - 使用真实 ThreeTierParser

    用于 FieldMappingPreview 实时预览解析效果。

    Args:
        request: PreviewParseRequest 包含 logs 和 template_id

    Returns:
        解析结果字典列表

    Raises:
        404: 模板不存在
    """
    # 获取模板
    template = _templates.get(request.template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {request.template_id} not found")

    # 使用真实 ThreeTierParser 进行解析
    try:
        from parser.pipeline import ThreeTierParser
        parser = ThreeTierParser()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parser initialization failed: {str(e)}")

    results = []
    for log in request.logs:
        try:
            parsed = parser.parse(log, template.device_type)
            results.append({
                "raw": log,
                "parsed": parsed,
                "status": "success",
                "error": None
            })
        except Exception as e:
            results.append({
                "raw": log,
                "parsed": None,
                "status": "failure",
                "error": str(e)
            })

    return {
        "results": results,
        "template_id": request.template_id
    }


@router.post("/test-parse", response_model=ParseTestResult)
async def test_parse(
    request: ParseTestRequest
) -> ParseTestResult:
    """
    DI-09: 解析测试接口

    用历史日志测试解析准确率，达标后开启实时接入。

    Args:
        request: 解析测试请求 { template_id, test_logs, ground_truth }

    Returns:
        ParseTestResult: 包含整体和字段级准确率

    Raises:
        404: 模板不存在
    """
    import os

    # 检查模板是否存在
    if request.template_id not in _templates:
        raise HTTPException(status_code=404, detail=f"Template {request.template_id} not found")

    template = _templates[request.template_id]

    # 获取准确率阈值
    min_confidence = float(os.environ.get("PARSE_MIN_CONFIDENCE", "0.85"))

    # 初始化 ThreeTierParser
    try:
        from parser.pipeline import ThreeTierParser
        parser = ThreeTierParser()
    except Exception as e:
        # 如果 parser 初始化失败，返回错误
        raise HTTPException(status_code=500, detail=f"Parser initialization failed: {str(e)}")

    # 解析日志
    parsed_results = []
    field_names = set()

    for log in request.test_logs:
        try:
            result = parser.parse(log, template.device_type)
            parsed_results.append({
                "success": result.get("parse_status") != "fallback",
                "raw": log,
                "parsed": result
            })
            # 收集所有字段名
            if isinstance(result, dict):
                field_names.update(result.keys())
        except Exception as e:
            parsed_results.append({
                "success": False,
                "raw": log,
                "parsed": {"error": str(e)}
            })

    # 计算准确率
    total_logs = len(request.test_logs)
    success_count = sum(1 for r in parsed_results if r["success"])
    failure_count = total_logs - success_count
    overall_accuracy = success_count / total_logs if total_logs > 0 else 0.0

    # 字段级准确率计算
    field_accuracies = []
    failed_samples = []

    # 如果有 ground truth，进行字段级对比
    if request.ground_truth and len(request.ground_truth) == total_logs:
        # 统计每个字段的正确次数
        field_correct = {field: 0 for field in field_names}
        field_total = {field: 0 for field in field_names}

        for i, (parsed_result, ground) in enumerate(zip(parsed_results, request.ground_truth)):
            if not parsed_result["success"]:
                failed_samples.append({
                    "log": parsed_result["raw"][:200],  # 截断避免过大
                    "error": "Parse failed"
                })
                continue

            parsed = parsed_result["parsed"]
            has_field_error = False

            for field_name in field_names:
                field_total[field_name] += 1
                expected = ground.get(field_name)
                actual = parsed.get(field_name)

                # 比较字段值（考虑 None 和空字符串的等价性）
                if expected == actual or (not expected and not actual):
                    field_correct[field_name] += 1
                else:
                    has_field_error = True

            if has_field_error:
                failed_samples.append({
                    "log": parsed_result["raw"][:200],
                    "parsed": parsed,
                    "expected": ground
                })

        # 计算每个字段的准确率
        for field_name in field_names:
            if field_total[field_name] > 0:
                accuracy = field_correct[field_name] / field_total[field_name]
                field_accuracies.append(FieldAccuracy(
                    field_name=field_name,
                    correct=field_correct[field_name],
                    total=field_total[field_name],
                    accuracy=accuracy
                ))
    else:
        # 无 ground truth 时，只计算整体成功率
        for parsed_result in parsed_results:
            if not parsed_result["success"]:
                failed_samples.append({
                    "log": parsed_result["raw"][:200],
                    "error": "Parse failed"
                })

        # 收集主要字段的准确率（基于成功解析的日志）
        for field_name in ["src_endpoint.ip", "dst_endpoint.ip", "src_endpoint.port",
                          "dst_endpoint.port", "message", "severity_id"]:
            if field_name in field_names:
                # 简单统计：有多少日志包含此字段
                field_present = sum(1 for r in parsed_results
                                  if r["success"] and r["parsed"].get(field_name))
                field_accuracies.append(FieldAccuracy(
                    field_name=field_name,
                    correct=field_present,
                    total=success_count,
                    accuracy=field_present / success_count if success_count > 0 else 0.0
                ))

    # 限制失败样例数量
    if len(failed_samples) > 5:
        failed_samples = failed_samples[:5]

    # 判断是否达标
    is_qualified = overall_accuracy >= min_confidence

    return ParseTestResult(
        total_logs=total_logs,
        success_count=success_count,
        failure_count=failure_count,
        overall_accuracy=round(overall_accuracy, 4),
        field_accuracies=field_accuracies,
        failed_samples=failed_samples,
        is_qualified=is_qualified
    )