"""
数据源健康检查 API

提供 /api/health/sources 端点，返回所有数据源的健康状态
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/health", tags=["health"])


class DataSourceStatus(str, Enum):
    """数据源状态枚举"""
    HEALTHY = "healthy"      # 正常运行
    DEGRADED = "degraded"   # 降级运行(有错误但可工作)
    DOWN = "down"           # 完全不可用


class DataSourceHealth(BaseModel):
    """数据源健康状态模型"""
    source_type: str = Field(..., description="数据源类型: ssh_syslog, windows_event, snmp_trap, api_polling, jdbc")
    source_name: str = Field(..., description="数据源名称/标识")
    status: DataSourceStatus = Field(..., description="健康状态")
    last_event_time: Optional[datetime] = Field(None, description="最近事件时间")
    events_per_minute: float = Field(0.0, ge=0, description="每分钟事件数")
    error_count: int = Field(0, ge=0, description="累计错误数")
    error_message: Optional[str] = Field(None, description="最新错误信息")
    metadata: Dict[str, str] = Field(default_factory=dict, description="额外元数据")


class DataSourceRegistry:
    """数据源注册表

    维护所有数据源的状态信息
    """

    def __init__(self):
        self._sources: Dict[str, DataSourceHealth] = {}
        self._last_report_time: Dict[str, datetime] = {}

    def register(
        self,
        source_type: str,
        source_name: str,
        **metadata
    ) -> None:
        """注册数据源"""
        key = f"{source_type}:{source_name}"
        if key not in self._sources:
            # 将所有 metadata 值转为字符串 (Pydantic Dict[str, str] 要求)
            str_metadata = {k: str(v) for k, v in metadata.items()}
            self._sources[key] = DataSourceHealth(
                source_type=source_type,
                source_name=source_name,
                status=DataSourceStatus.HEALTHY,
                metadata=str_metadata
            )

    def update(
        self,
        source_name: str,
        last_event_time: Optional[datetime] = None,
        events_per_minute: Optional[float] = None,
        error_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> None:
        """更新数据源状态"""
        if source_name not in self._sources:
            return

        source = self._sources[source_name]

        if last_event_time is not None:
            source.last_event_time = last_event_time

        if events_per_minute is not None:
            source.events_per_minute = events_per_minute

        if error_count is not None:
            source.error_count = error_count

        if error_message is not None:
            source.error_message = error_message

        # 更新状态
        self._update_status(source)

    def _update_status(self, source: DataSourceHealth) -> None:
        """根据指标更新状态"""
        now = datetime.now(timezone.utc)

        # 检查是否超时(5分钟无事件视为 down)
        if source.last_event_time:
            elapsed = (now - source.last_event_time).total_seconds()
            if elapsed > 300:
                source.status = DataSourceStatus.DOWN
                return

        # 检查错误率
        if source.error_count > 100:
            source.status = DataSourceStatus.DOWN
        elif source.error_count > 10:
            source.status = DataSourceStatus.DEGRADED
        else:
            source.status = DataSourceStatus.HEALTHY

    def get_all(self) -> List[DataSourceHealth]:
        """获取所有数据源状态"""
        return list(self._sources.values())

    def get(self, source_name: str) -> Optional[DataSourceHealth]:
        """获取指定数据源状态"""
        return self._sources.get(source_name)


# 全局数据源注册表
_source_registry = DataSourceRegistry()


# 预注册标准数据源
_source_registry.register(
    source_type="ssh_syslog",
    source_name="cisco_asa",
    host="0.0.0.0",
    port=514,
    protocol="tcp"
)
_source_registry.register(
    source_type="ssh_syslog",
    source_name="fortinet_fortigate",
    host="0.0.0.0",
    port=514,
    protocol="tcp"
)
_source_registry.register(
    source_type="windows_event",
    source_name="windows_server_01",
    host="nxlog",
    port=514
)
_source_registry.register(
    source_type="snmp_trap",
    source_name="network_devices",
    host="snmptrapd",
    port=162
)
_source_registry.register(
    source_type="api_polling",
    source_name="threat_intel"
)
_source_registry.register(
    source_type="api_polling",
    source_name="siem_integration"
)
_source_registry.register(
    source_type="jdbc",
    source_name="siem_audit_db"
)


@router.get("/sources", response_model=List[DataSourceHealth])
async def get_all_source_health():
    """获取所有数据源健康状态

    Returns:
        List[DataSourceHealth]: 所有已注册数据源的健康状态列表
    """
    return _source_registry.get_all()


@router.get("/sources/{source_name}", response_model=DataSourceHealth)
async def get_source_health(source_name: str):
    """获取指定数据源健康状态

    Args:
        source_name: 数据源名称

    Returns:
        DataSourceHealth: 数据源健康状态

    Raises:
        HTTPException: 数据源不存在时抛出 404
    """
    source = _source_registry.get(source_name)
    if not source:
        raise HTTPException(status_code=404, detail=f"Data source '{source_name}' not found")
    return source


@router.post("/sources/{source_name}/report")
async def report_source_status(
    source_name: str,
    last_event_time: Optional[datetime] = None,
    events_per_minute: Optional[float] = None,
    error_count: Optional[int] = None,
    error_message: Optional[str] = None
):
    """数据源上报自身状态(供 collector 调用)

    Args:
        source_name: 数据源名称
        last_event_time: 最近事件时间
        events_per_minute: 每分钟事件数
        error_count: 累计错误数
        error_message: 最新错误信息

    Returns:
        dict: 确认信息
    """
    _source_registry.update(
        source_name=source_name,
        last_event_time=last_event_time,
        events_per_minute=events_per_minute,
        error_count=error_count,
        error_message=error_message
    )
    return {"status": "ok", "source_name": source_name}


@router.get("/summary")
async def get_health_summary():
    """获取健康检查摘要

    Returns:
        dict: 包含 healthy/degraded/down 数量的摘要
    """
    sources = _source_registry.get_all()
    summary = {
        "total": len(sources),
        "healthy": sum(1 for s in sources if s.status == DataSourceStatus.HEALTHY),
        "degraded": sum(1 for s in sources if s.status == DataSourceStatus.DEGRADED),
        "down": sum(1 for s in sources if s.status == DataSourceStatus.DOWN),
        "checked_at": datetime.now(timezone.utc).isoformat()
    }
    return summary
