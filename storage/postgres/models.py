"""Pydantic models for SecAlert storage."""
from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import ipaddress


class NetworkInfo(BaseModel):
    """Network fields for an alert."""
    src_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_ip: Optional[str] = None
    dst_port: Optional[int] = None
    protocol: Optional[str] = None

    @field_validator('src_ip', 'dst_ip')
    @classmethod
    def validate_ip(cls, v: Optional[str]) -> Optional[str]:
        if v:
            ipaddress.ip_address(v)  # Validate IP format
        return v


class SecurityInfo(BaseModel):
    """Security-related fields."""
    severity: str = Field(description="low, medium, high, critical")
    action: str = Field(default="detected")
    alert_signature: Optional[str] = None


class OCSFAlert(BaseModel):
    """OCSF-compliant alert event."""
    event_id: UUID
    timestamp: datetime
    source_type: str
    source_name: str
    event_type: str
    network: Optional[NetworkInfo] = None
    security: Optional[SecurityInfo] = None
    raw_event: dict = Field(description="Original event data")


class AlertRecord(BaseModel):
    """Full alert record for PostgreSQL storage."""
    id: UUID
    timestamp: datetime
    source_type: str
    source_name: str
    event_type: str
    src_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_ip: Optional[str] = None
    dst_port: Optional[int] = None
    protocol: Optional[str] = None
    severity: Optional[str] = None
    alert_signature: Optional[str] = None
    raw_event: dict
    ocsf_event: OCSFAlert
    created_at: datetime

    class Config:
        from_attributes = True
