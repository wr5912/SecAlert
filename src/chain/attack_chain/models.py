"""
攻击链数据模型

Pydantic 模型定义
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class AlertModel(BaseModel):
    """告警模型"""
    alert_id: str
    timestamp: Optional[str] = None
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    event_type: Optional[str] = None
    severity: int = 0
    alert_signature: Optional[str] = None
    mitre_tactic: Optional[str] = None
    mitre_technique_id: Optional[str] = None
    mitre_technique_name: Optional[str] = None

    class Config:
        from_attributes = True


class AttackChainModel(BaseModel):
    """攻击链模型"""
    chain_id: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    alert_count: int = 0
    max_severity: int = 0
    status: str = "active"  # active, resolved, false_positive
    asset_ip: Optional[str] = None
    alerts: List[AlertModel] = Field(default_factory=list)

    class Config:
        from_attributes = True


class AttackChainCreate(BaseModel):
    """创建攻击链请求"""
    alert_ids: List[str]
    asset_ip: Optional[str] = None
    correlation_type: str = "ip"


class AttackChainListResponse(BaseModel):
    """攻击链列表响应"""
    chains: List[AttackChainModel]
    total: int
    limit: int
    offset: int
