#!/usr/bin/env python3
"""
Syslog 模拟器 - 发送和接收 CEF/Syslog 格式日志

功能:
1. 主动生成安全设备日志 (防火墙、IDS、WAF 等)
2. 监听 UDP/TCP Syslog 端口接收日志
3. 将日志发送到指定目标 (SecAlert Vector)
"""

import asyncio
import json
import logging
import random
import socket
import struct
import time
from datetime import datetime, timezone
from typing import Optional

import yaml

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SyslogGenerator:
    """生成模拟安全设备的 Syslog 日志"""

    # CEF 格式: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
    # 示例: CEF:0|Check Point|VPN-1|FireWall-1|100|Connection rejected|8|src=192.168.1.100 dst=10.0.0.1

    DEVICES = [
        {"vendor": "Check Point", "product": "VPN-1", "version": "R80.30"},
        {"vendor": "Palo Alto", "product": "PAN-OS", "version": "10.1"},
        {"vendor": "Fortinet", "product": "FortiGate", "version": "v6.4"},
        {"vendor": "Cisco", "product": "ASA", "version": "9.8"},
        {"vendor": "Snort", "product": "IDS", "version": "2.9.17"},
        {"vendor": "Suricata", "product": "IDS", "version": "6.0"},
        {"vendor": "Imperva", "product": "WAF", "version": "14.0"},
        {"vendor": "F5", "product": "BIG-IP ASM", "version": "15.1"},
    ]

    # ATT&CK 战术和技术
    ATTACK_PATTERNS = [
        {"technique": "T1078", "name": "Valid Accounts", "severity": 6},
        {"technique": "T1110", "name": "Brute Force", "severity": 7},
        {"technique": "T1190", "name": "Exploit Public-Facing Application", "severity": 8},
        {"technique": "T1210", "name": "Exploitation of Remote Services", "severity": 9},
        {"technique": "T1055", "name": "Process Injection", "severity": 8},
        {"technique": "T1021", "name": "Remote Services", "severity": 7},
        {"technique": "T1048", "name": "Exfiltration Over Alternative Protocol", "severity": 6},
        {"technique": "T1484", "name": "Domain Trust Modification", "severity": 5},
    ]

    def __init__(self, config: dict):
        self.target_host = config.get("target_host", "localhost")
        self.target_port = int(config.get("target_port", 514))
        self.protocol = config.get("protocol", "UDP").upper()
        self.rate = int(config.get("rate", 10))  # logs per second
        self.format = config.get("format", "CEF").upper()
        self._running = False

    def generate_cef_log(self) -> str:
        """生成一条 CEF 格式日志"""
        device = random.choice(self.DEVICES)
        attack = random.choice(self.ATTACK_PATTERNS)

        src_ip = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
        dst_ip = f"10.{random.randint(1,10)}.{random.randint(1,255)}.{random.randint(1,255)}"
        src_port = random.randint(1024, 65535)
        dst_port = random.choice([22, 80, 443, 3389, 8080, 8443])
        action = random.choice(["blocked", "allowed", "detected", "alert"])
        severity = attack["severity"]

        extension = (
            f"src={src_ip} "
            f"dst={dst_ip} "
            f"spt={src_port} "
            f"dpt={dst_port} "
            f"act={action} "
            f"msg=Attempted {attack['name']} from {src_ip} to {dst_ip}:{dst_port}"
        )

        cef = (
            f"CEF:0|{device['vendor']}|{device['product']}|{device['version']}|"
            f"{attack['technique']}|{attack['name']}|{severity}|{extension}"
        )
        return cef

    def generate_syslog_rfc5424(self, message: str) -> bytes:
        """生成 RFC 5424 格式 Syslog"""
        pri = 134  # Local0 + Info
        version = 1
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f%z")
        hostname = socket.gethostname()
        app_name = "simulator"
        proc_id = random.randint(1000, 9999)
        msg_id = f"{random.randint(1,999):03d}"

        header = f"<{pri}>{version} {timestamp} {hostname} {app_name} {proc_id} {msg_id} "
        return (header + message).encode("utf-8")

    def send_log(self, message: str):
        """发送日志到目标"""
        try:
            if self.protocol == "UDP":
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.sendto(self.generate_syslog_rfc5424(message), (self.target_host, self.target_port))
                sock.close()
            else:  # TCP
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect((self.target_host, self.target_port))
                sock.sendall(self.generate_syslog_rfc5424(message) + b"\n")
                sock.close()
        except Exception as e:
            logger.error(f"Failed to send log: {e}")

    async def generate_loop(self):
        """异步生成日志循环"""
        self._running = True
        interval = 1.0 / self.rate if self.rate > 0 else 1.0

        while self._running:
            try:
                if self.format == "CEF":
                    log = self.generate_cef_log()
                else:
                    log = self.generate_cef_log()  # 默认 CEF

                self.send_log(log)
                logger.debug(f"Sent: {log[:100]}...")

                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"Error in generate loop: {e}")
                await asyncio.sleep(1)

    def stop(self):
        self._running = False


class SyslogReceiver:
    """接收 Syslog 日志"""

    def __init__(self, host: str = "0.0.0.0", port: int = 514, protocol: str = "UDP"):
        self.host = host
        self.port = port
        self.protocol = protocol.upper()
        self._running = False

    async def receive_udp(self):
        """接收 UDP Syslog"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((self.host, self.port))

        logger.info(f"UDP Syslog receiver listening on {self.host}:{self.port}")

        while self._running:
            try:
                data, addr = sock.recvfrom(65535)
                message = data.decode("utf-8", errors="replace").strip()
                logger.info(f"Received from {addr}: {message[:200]}")
            except Exception as e:
                if self._running:
                    logger.error(f"Receive error: {e}")

    async def receive_tcp(self):
        """接收 TCP Syslog"""
        server = await asyncio.start_server(
            self._handle_tcp_client, self.host, self.port
        )
        logger.info(f"TCP Syslog receiver listening on {self.host}:{self.port}")

        async with server:
            await server.serve_forever()

    async def _handle_tcp_client(self, reader, writer):
        addr = writer.get_extra_info('peername')
        logger.info(f"TCP connection from {addr}")

        while self._running:
            try:
                data = await reader.read(65535)
                if not data:
                    break
                message = data.decode("utf-8", errors="replace").strip()
                for line in message.split("\n"):
                    if line:
                        logger.info(f"Received from {addr}: {line[:200]}")
            except Exception as e:
                logger.error(f"TCP receive error: {e}")
                break

        writer.close()
        await writer.wait_closed()

    async def run(self):
        """运行接收器"""
        self._running = True
        try:
            if self.protocol == "UDP":
                await self.receive_udp()
            else:
                await self.receive_tcp()
        except KeyboardInterrupt:
            self._running = False


async def main():
    # 加载配置
    config_path = "/app/config.yaml"
    try:
        with open(config_path) as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        config = {
            "target_host": "localhost",
            "target_port": 514,
            "protocol": "UDP",
            "rate": 10,
            "format": "CEF"
        }

    generator = SyslogGenerator(config)

    # 并行运行: 发送 + 接收
    receive_config = {
        "host": "0.0.0.0",
        "port": int(config.get("listen_port", 1514)),
        "protocol": config.get("protocol", "UDP")
    }
    receiver = SyslogReceiver(**receive_config)

    try:
        await asyncio.gather(
            generator.generate_loop(),
            receiver.run()
        )
    except KeyboardInterrupt:
        generator.stop()
        logger.info("Shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
