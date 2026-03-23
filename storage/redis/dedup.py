"""Redis-based sliding window deduplication for alerts."""
import hashlib
import os
from typing import Optional

import redis


class RedisDedup:
    """Deduplicate alerts using Redis SET NX EX (24h window per user decision)."""

    KEY_PREFIX = "dedup"

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        window_seconds: int = 86400  # 24 hours per user decision
    ):
        self.redis = redis.Redis(
            host=host or os.getenv("REDIS_HOST", "localhost"),
            port=port or int(os.getenv("REDIS_PORT", "6379")),
            decode_responses=True
        )
        self.window = window_seconds

    def is_duplicate(self, event: dict) -> bool:
        """
        Check if event is duplicate using SET NX EX.

        Returns True if duplicate (key existed), False if new event.
        Uses SET NX EX: only set if not exists, with 24h expiry.
        """
        key = self._make_key(event)
        result = self.redis.set(key, "1", nx=True, ex=self.window)
        return result is None  # None means key existed (duplicate)

    def _make_key(self, event: dict) -> str:
        """
        Create deduplication key from event fields.

        Key = md5(source_type:alert_signature:src_ip:dest_ip:time_bucket)
        Time bucket = hour (to dedupe repeats within same hour)
        """
        source_type = event.get("source_type", "")
        alert_sig = event.get("alert_signature", "")
        src_ip = event.get("src_ip", "")
        dest_ip = event.get("dest_ip", "")

        normalized = f"{source_type}:{alert_sig}:{src_ip}:{dest_ip}"
        hash_val = hashlib.md5(normalized.encode()).hexdigest()
        return f"{self.KEY_PREFIX}:{hash_val}"

    def ping(self) -> bool:
        """Check Redis connectivity."""
        try:
            return self.redis.ping()
        except redis.ConnectionError:
            return False
