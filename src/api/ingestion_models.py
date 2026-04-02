"""
数据接入 Pydantic 模型

定义数据源模板的数据结构和验证规则
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class DeviceType(str, Enum):
    """支持的设备类型"""
    FIREWALL = "firewall"
    IDS = "ids"
    VPN = "vpn"
    SWITCH = "switch"
    ROUTER = "router"
    WAF = "waf"
    OTHER = "other"


class LogFormat(str, Enum):
    """支持的日志格式"""
    CEF = "CEF"
    SYSLOG = "Syslog"
    JSON = "JSON"
    AUTO = "Auto"
    CUSTOM = "Custom"
    CUSTOM_PYTHON = "CustomPython"


class ConnectionConfig(BaseModel):
    """连接配置"""
    host: str = Field(..., description="主机地址或 IP")
    port: int = Field(..., ge=1, le=65535, description="端口号")
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码或密钥")
    protocol: str = Field(..., description="连接协议: ssh, snmp, http, jdbc")


class DataSourceTemplate(BaseModel):
    """数据源模板"""
    id: str = Field(..., description="模板唯一 ID")
    name: str = Field(..., min_length=1, max_length=100, description="模板名称")
    device_type: str = Field(..., description="设备类型")
    connection: ConnectionConfig = Field(..., description="连接参数")
    log_format: str = Field(..., description="日志格式")
    custom_regex: Optional[str] = Field(None, description="自定义正则 (Custom 格式时必填)")


class TemplateCreate(BaseModel):
    """创建模板请求"""
    name: str = Field(..., min_length=1, max_length=100, description="模板名称")
    device_type: DeviceType = Field(..., description="设备类型")
    connection: ConnectionConfig = Field(..., description="连接参数")
    log_format: LogFormat = Field(..., description="日志格式")
    custom_regex: Optional[str] = Field(None, description="自定义正则")
    metadata: CollectionMetadata = Field(..., description="采集元数据（vendor/product/device/tenant/environment）")


class TemplateUpdate(BaseModel):
    """更新模板请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    device_type: Optional[DeviceType] = None
    connection: Optional[ConnectionConfig] = None
    log_format: Optional[LogFormat] = None
    custom_regex: Optional[str] = None
    metadata: Optional[CollectionMetadata] = None


class TemplateListResponse(BaseModel):
    """模板列表响应"""
    templates: List[DataSourceTemplate]
    total: int


class TemplateResponse(BaseModel):
    """单个模板响应"""
    id: str
    name: str
    device_type: str
    connection: ConnectionConfig
    log_format: str
    custom_regex: Optional[str]


class DeleteResponse(BaseModel):
    """删除响应"""
    success: bool
    message: str


class HealthStatus(str, Enum):
    """健康状态"""
    ONLINE = "online"
    OFFLINE = "offline"
    WARNING = "warning"


class DataSourceStatus(BaseModel):
    """数据源健康状态 (DI-06)"""
    template_id: str = Field(..., description="模板 ID")
    status: HealthStatus = Field(..., description="状态: online/offline/warning")
    last_sync: Optional[str] = Field(None, description="最后同步时间 (ISO)")
    events_received: int = Field(0, description="接收事件数")
    error_message: Optional[str] = Field(None, description="错误信息")


class Environment(str, Enum):
    """环境枚举"""
    PROD = "prod"
    DEV = "dev"
    TEST = "test"


class CollectionMetadata(BaseModel):
    """采集元数据（GM-01 强制字段）"""
    vendor_name: str = Field(..., min_length=1, max_length=100, description="厂商名，如 Suricata")
    product_name: str = Field(..., min_length=1, max_length=100, description="产品名，如 EVE JSON")
    device_type: DeviceType = Field(..., description="设备类型")
    tenant_id: str = Field(default="default", description="租户标识（MSSP 多租户）")
    environment: Environment = Field(default=Environment.PROD, description="环境")
    target_category_uid: Optional[int] = Field(None, description="OCSF 目标类别 UID")
    target_class_uid: Optional[int] = Field(None, description="OCSF 事件类 UID")
