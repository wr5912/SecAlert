#!/usr/bin/env python3
"""
日志文件模拟器

持续向日志文件写入模拟的安全日志，模拟应用服务器日志场景。
支持格式: JSON, SYSLOG, PLAIN
"""

import asyncio
import json
import logging
import os
import random
import time
from datetime import datetime, timezone

import yaml

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LogWriter:
    """日志文件写入器"""

    LOG_FORMATS = ["JSON", "SYSLOG", "PLAIN"]

    def __init__(self, config: dict):
        self.log_dir = config.get("log_dir", "/app/logs")
        self.log_interval = float(config.get("log_interval", 2))
        self.log_format = config.get("log_format", "JSON").upper()
        self.batch_size = int(config.get("batch_size", 1))

        # 确保日志目录存在
        os.makedirs(self.log_dir, exist_ok=True)

        # 日志文件路径
        self.app_log_path = os.path.join(self.log_dir, "app.log")
        self.auth_log_path = os.path.join(self.log_dir, "auth.log")
        self.network_log_path = os.path.join(self.log_dir, "network.log")

        self._running = False

    def _generate_app_log(self) -> str:
        """生成应用日志"""
        events = [
            "User logged in",
            "User logged out",
            "Password change attempted",
            "Session timeout",
            "API request processed",
            "Configuration loaded",
            "Service started",
            "Service stopped",
            "Backup completed",
            "Cache cleared"
        ]

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": random.choice(["INFO", "WARN", "ERROR", "DEBUG"]),
            "service": random.choice(["api-gateway", "auth-service", "data-processor", "web-frontend"]),
            "event": random.choice(events),
            "user": f"user{random.randint(1, 100)}",
            "request_id": f"req-{random.randint(100000, 999999)}"
        }

        if self.log_format == "JSON":
            return json.dumps(log_entry)
        elif self.log_format == "SYSLOG":
            return f'<134>{log_entry["timestamp"]} localhost {log_entry["service"]}[12345]: {json.dumps(log_entry)}'
        else:  # PLAIN
            return f'[{log_entry["timestamp"]}] {log_entry["level"]} {log_entry["service"]}: {log_entry["event"]}'

    def _generate_auth_log(self) -> str:
        """生成认证日志"""
        events = [
            ("Accepted password", "INFO"),
            ("Failed password", "WARNING"),
            ("Invalid user", "WARNING"),
            ("Session opened", "INFO"),
            ("Session closed", "INFO"),
            ("Disconnected", "INFO"),
            (" authentication failure", "WARNING"),
            ("sudo: COMMAND", "INFO")
        ]

        event, level = random.choice(events)
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "service": "sshd" if random.random() > 0.5 else "login",
            "src_ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "user": f"user{random.randint(1, 50)}",
            "event": event
        }

        if self.log_format == "JSON":
            return json.dumps(log_entry)
        elif self.log_format == "SYSLOG":
            return f'<134>{log_entry["timestamp"]} localhost sshd[12345]: {json.dumps(log_entry)}'
        else:
            return f'[{log_entry["timestamp"]}] {level} {log_entry["src_ip"]} {log_entry["service"]}: {log_entry["user"]} {log_entry["event"]}'

    def _generate_network_log(self) -> str:
        """生成网络日志"""
        protocols = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "DNS"]
        actions = ["CONNECT", "ACCEPT", "DROP", "REJECT", "BLOCK"]

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": random.choice(["INFO", "WARNING", "ERROR"]),
            "src_ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "dst_ip": f"10.{random.randint(1,10)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([22, 80, 443, 3389, 8080]),
            "protocol": random.choice(protocols),
            "action": random.choice(actions),
            "bytes": random.randint(100, 1000000)
        }

        if self.log_format == "JSON":
            return json.dumps(log_entry)
        elif self.log_format == "SYSLOG":
            return f'<134>{log_entry["timestamp"]} localhost firewall[12345]: {json.dumps(log_entry)}'
        else:
            return f'[{log_entry["timestamp"]}] {log_entry["action"]} {log_entry["protocol"]} {log_entry["src_ip"]}:{log_entry["src_port"]} -> {log_entry["dst_ip"]}:{log_entry["dst_port"]} bytes={log_entry["bytes"]}'

    def _write_log(self, path: str, content: str):
        """写入日志到文件 (追加)"""
        try:
            with open(path, "a") as f:
                f.write(content + "\n")
                f.flush()
        except Exception as e:
            logger.error(f"Failed to write to {path}: {e}")

    async def run(self):
        """运行日志写入循环"""
        self._running = True
        logger.info(f"Starting log writer: format={self.log_format}, interval={self.log_interval}s")

        while self._running:
            try:
                # 随机选择日志类型
                log_type = random.choice(["app", "auth", "network"])

                if log_type == "app":
                    log = self._generate_app_log()
                    self._write_log(self.app_log_path, log)
                elif log_type == "auth":
                    log = self._generate_auth_log()
                    self._write_log(self.auth_log_path, log)
                else:
                    log = self._generate_network_log()
                    self._write_log(self.network_log_path, log)

                logger.debug(f"Wrote {log_type} log: {log[:80]}...")

                await asyncio.sleep(self.log_interval)

            except Exception as e:
                logger.error(f"Error in log writer: {e}")
                await asyncio.sleep(1)

    def stop(self):
        self._running = False


async def main():
    # 加载配置
    config_path = "/app/config.yaml"
    try:
        with open(config_path) as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        config = {
            "log_dir": "/app/logs",
            "log_interval": 2,
            "log_format": "JSON",
            "batch_size": 1
        }

    writer = LogWriter(config)

    try:
        await writer.run()
    except KeyboardInterrupt:
        writer.stop()
        logger.info("Shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
