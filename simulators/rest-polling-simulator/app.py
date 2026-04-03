#!/usr/bin/env python3
"""
REST API Polling 模拟器

模拟 WAF、威胁情报平台等 REST API，定期产生安全日志供 SecAlert 轮询采集。
"""

import asyncio
import json
import random
import time
from datetime import datetime, timezone
from typing import Optional

import yaml
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="REST Polling Simulator")

# 全局状态
config = {}
alert_buffer = []
ALERT_MAX_SIZE = 1000


class SecurityAlert(BaseModel):
    alert_id: str
    timestamp: str
    severity: str  # low, medium, high, critical
    category: str
    source: str
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    action: str  # blocked, allowed, detected
    message: str
    metadata: dict = {}


def generate_alert() -> dict:
    """生成一条模拟安全告警"""
    categories = [
        "SQL Injection",
        "XSS Attack",
        "CSRF Token Missing",
        "Brute Force Attempt",
        "Malware Detected",
        "Data Exfiltration",
        "Unauthorized Access",
        "DDoS Attack",
        "Privilege Escalation",
        "Configuration Change"
    ]

    severities = ["low", "medium", "high", "critical"]
    actions = ["blocked", "allowed", "detected", "alert"]

    alert = {
        "alert_id": f"ALERT-{int(time.time() * 1000)}-{random.randint(1000, 9999)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": random.choice(severities),
        "category": random.choice(categories),
        "source": random.choice(["WAF", "IDS", "Firewall", "Endpoint", "SIEM"]),
        "src_ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
        "dst_ip": f"10.{random.randint(1,10)}.{random.randint(1,255)}.{random.randint(1,255)}",
        "src_port": random.randint(1024, 65535),
        "dst_port": random.choice([22, 80, 443, 3389, 8080, 8443, 3306, 5432]),
        "protocol": random.choice(["TCP", "UDP", "HTTP", "HTTPS"]),
        "action": random.choice(actions),
        "message": "",
        "metadata": {
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "country": random.choice(["CN", "US", "RU", "KR", "JP", "DE", "FR"]),
            "asn": f"AS{random.randint(1000, 99999)}",
            "reputation_score": random.randint(1, 100)
        }
    }

    # 生成消息
    alert["message"] = (
        f"{alert['action'].upper()} {alert['severity'].upper()} {alert['category']} "
        f"from {alert['src_ip']}:{alert['src_port']} to {alert['dst_ip']}:{alert['dst_port']}"
    )

    return alert


def generate_batch(count: int = 10) -> list:
    """生成一批告警"""
    return [generate_alert() for _ in range(count)]


@app.on_event("startup")
async def startup_event():
    """启动时加载配置并初始化告警缓冲"""
    global config

    config_path = "/app/config.yaml"
    try:
        with open(config_path) as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        config = {
            "log_interval": 5,
            "batch_size": 10,
            "max_buffer": 1000
        }

    # 初始化告警缓冲
    global alert_buffer
    alert_buffer = generate_batch(50)

    # 启动后台任务持续生成告警
    asyncio.create_task(alert_generator())


async def alert_generator():
    """后台任务：持续生成告警到缓冲"""
    interval = config.get("log_interval", 5)
    batch_size = config.get("batch_size", 10)

    while True:
        try:
            await asyncio.sleep(interval)
            new_alerts = generate_batch(batch_size)
            alert_buffer.extend(new_alerts)

            # 保持缓冲大小
            while len(alert_buffer) > ALERT_MAX_SIZE:
                alert_buffer.pop(0)

        except Exception as e:
            print(f"Alert generator error: {e}")


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy", "buffer_size": len(alert_buffer)}


@app.get("/api/waf-logs")
async def get_waf_logs(limit: int = 100, since_id: Optional[str] = None):
    """
    获取 WAF 日志 (供 SecAlert REST Source 轮询)

    Query params:
    - limit: 最大返回条数 (默认 100)
    - since_id: 上一页最后一条 alert_id，用于分页
    """
    if since_id:
        # 找到 since_id 之后的数据
        start_idx = 0
        for i, alert in enumerate(alert_buffer):
            if alert["alert_id"] == since_id:
                start_idx = i + 1
                break
        logs = alert_buffer[start_idx:start_idx + limit]
    else:
        # 返回最新的 limit 条
        logs = alert_buffer[-limit:] if len(alert_buffer) > limit else alert_buffer

    return {
        "total": len(alert_buffer),
        "returned": len(logs),
        "logs": logs,
        "next_since_id": logs[-1]["alert_id"] if logs else None
    }


@app.get("/api/threat-intel")
async def get_threat_intel():
    """获取威胁情报 (模拟)"""
    indicators = []
    for _ in range(random.randint(5, 20)):
        ioc = {
            "type": random.choice(["ip", "domain", "hash", "url"]),
            "value": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "threat_type": random.choice(["malware", "bot", "c2", "phishing"]),
            "confidence": random.randint(50, 100),
            "last_seen": datetime.now(timezone.utc).isoformat()
        }
        indicators.append(ioc)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(indicators),
        "indicators": indicators
    }


@app.get("/api/dns-logs")
async def get_dns_logs(limit: int = 100):
    """获取 DNS 查询日志 (模拟)"""
    logs = []
    for _ in range(min(limit, 50)):
        log = {
            "query_id": f"DNS-{int(time.time() * 1000)}-{random.randint(1000, 9999)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "src_ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "query_name": random.choice([
                "malware.example.com",
                "C2-server.evil.com",
                "phishing.site.net",
                "normal.domain.com",
                "auth.corporate.local"
            ]),
            "query_type": random.choice(["A", "AAAA", "MX", "TXT", "CNAME"]),
            "response_code": random.choice(["NOERROR", "NXDOMAIN", "SERVFAIL"]),
            "blocked": random.choice([True, False])
        }
        logs.append(log)

    return {
        "total": len(logs),
        "logs": logs
    }


if __name__ == "__main__":
    import os
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8081"))

    uvicorn.run(app, host=host, port=port)
