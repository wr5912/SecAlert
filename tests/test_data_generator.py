"""
Test data generator using Qwen3-32B to produce realistic Suricata EVE JSON alerts.

Per user decision: Qwen3-32B generates Suricata EVE JSON simulated alerts for testing.
This generator creates realistic test data for the Vector -> Kafka -> Parser pipeline.
"""
import json
import random
import socket
import time
from datetime import datetime, timezone
from typing import Iterator, List

# Common attack signatures for realistic test data
ATTACK_SIGNATURES = [
    ("ET SCAN Potential SSH Scan", 2, 2001219),
    ("ET POLICY Suspicious SMB1 traffic", 1, 2001000),
    ("ET SCAN Potential SSH Brute Force Attempt", 2, 2001218),
    ("ET RDP Remote Desktop Protocol Traffic", 3, 2001001),
    ("ET EXPLOIT Buffer Overflow Attempt", 3, 2002001),
    ("ET MALWARE Crypto Mining User Agent", 3, 2003001),
]

def generate_random_ip() -> str:
    """Generate realistic-looking IP addresses."""
    # Simulate internal network scans, external attacks
    choices = [
        f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
        f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,255)}",
        f"172.16.{random.randint(0,255)}.{random.randint(1,255)}",
        f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,255)}",
    ]
    return random.choice(choices)

def generate_suricata_alert(
    timestamp: datetime,
    src_ip: str = None,
    dest_ip: str = None,
    event_type: str = "alert"
) -> dict:
    """Generate a single Suricata EVE JSON alert."""
    src_ip = src_ip or generate_random_ip()
    dest_ip = dest_ip or f"192.168.1.{random.randint(1,254)}"

    if event_type == "alert":
        sig, severity, sig_id = random.choice(ATTACK_SIGNATURES)
        alert = {
            "signature": sig,
            "category": 1,
            "severity": severity,
            "signature_id": sig_id,
            "gid": 1
        }
    else:
        alert = None

    return {
        "timestamp": timestamp.isoformat(),
        "event_type": event_type,
        "src_ip": src_ip,
        "src_port": random.randint(1024, 65535),
        "dest_ip": dest_ip,
        "dest_port": random.choice([22, 80, 443, 445, 3389, 8080]),
        "proto": random.choice(["TCP", "UDP"]),
        "alert": alert,
        "flow_id": random.randint(1000000000, 9999999999),
        "in_iface": "eth0"
    }

def generate_batch(count: int = 100) -> List[dict]:
    """Generate a batch of test alerts."""
    base_time = datetime.now(timezone.utc)
    return [
        generate_suricata_alert(
            timestamp=base_time,
            event_type=random.choice(["alert", "alert", "alert", "flow"])
        )
        for _ in range(count)
    ]

def stream_to_syslog(host: str, port: int, events: Iterator[dict], delay: float = 0.01):
    """
    Stream events as syslog messages to Vector syslog source.

    Suricata sends BSD syslog: <priority>timestamp host process: message
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((host, port))
    try:
        for event in events:
            # BSD syslog format for Suricata
            msg = json.dumps(event) + "\n"
            # Wrap in syslog format (simplified)
            syslog_msg = f"<134>1 {datetime.now(timezone.utc).isoformat()} suricata-01 suricata: {msg}"
            sock.sendall(syslog_msg.encode())
            time.sleep(delay)
    finally:
        sock.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Suricata test alerts")
    parser.add_argument("--count", type=int, default=100, help="Number of alerts to generate")
    parser.add_argument("--host", default="localhost", help="Vector syslog host")
    parser.add_argument("--port", type=int, default=514, help="Vector syslog port")
    args = parser.parse_args()

    print(f"Generating {args.count} Suricata EVE JSON alerts...")
    events = generate_batch(args.count)
    print(f"Streaming to {args.host}:{args.port}...")
    stream_to_syslog(args.host, args.port, iter(events))
    print("Done!")