"""
数据接入 API 接口

FastAPI endpoints for data source template management
DI-01~DI-04: 模板 CRUD 操作
"""

import uuid
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict

from .ingestion_models import (
    DataSourceTemplate,
    TemplateCreate,
    TemplateUpdate,
    TemplateListResponse,
    DeleteResponse,
    ConnectionConfig
)

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

# 内存存储 (生产环境应使用数据库)
_templates: Dict[str, DataSourceTemplate] = {}


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
    return DeleteResponse(success=True, message=f"Template {template_id} deleted")
