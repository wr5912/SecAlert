#!/usr/bin/env python3
"""
JDBC 数据库轮询脚本
用于采集数据库审计日志、安全告警等

依赖:
    pip install sqlalchemy schedule confluent-kafka pyyaml

用法:
    python jdbc_poller.py --config config.yaml
"""

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import schedule
import yaml
from confluent_kafka import Producer
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class JdbcPoller:
    """JDBC 数据库轮询器

    支持:
    - 增量轮询 (基于递增 ID 或时间戳)
    - 多数据库类型 (PostgreSQL, MySQL, Oracle, SQL Server)
    - Kafka 消息发送
    - 优雅退出
    """

    def __init__(
        self,
        connection_url: str,
        query: str,
        kafka_topic: str,
        kafka_bootstrap_servers: str,
        id_column: Optional[str] = None,
        timestamp_column: Optional[str] = None,
        poll_interval_seconds: int = 60
    ):
        """初始化 JDBC 轮询器

        Args:
            connection_url: SQLAlchemy 连接 URL
            query: SQL 查询语句
            kafka_topic: Kafka 目标 topic
            kafka_bootstrap_servers: Kafka 服务器地址
            id_column: 递增 ID 列名，用于增量轮询
            timestamp_column: 时间戳列名，用于增量轮询
            poll_interval_seconds: 轮询间隔(秒)
        """
        self.engine: Engine = create_engine(
            connection_url,
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600
        )
        self.query = query
        self.kafka_topic = kafka_topic
        self.producer = Producer({
            "bootstrap.servers": kafka_bootstrap_servers,
            "acks": "all"
        })
        self.id_column = id_column
        self.timestamp_column = timestamp_column
        self.poll_interval = poll_interval_seconds

        # 增量轮询状态
        self._last_id: int = 0
        self._last_timestamp: Optional[datetime] = None

        # 优雅退出标志
        self._running = True

    def _build_incremental_query(self) -> str:
        """构建增量轮询 SQL"""
        conditions = []

        if self.id_column and self._last_id > 0:
            conditions.append(f"{self.id_column} > {self._last_id}")

        if self.timestamp_column and self._last_timestamp:
            ts_str = self._last_timestamp.isoformat()
            conditions.append(f"{self.timestamp_column} > '{ts_str}'")

        if conditions:
            where_keyword = "WHERE" if "WHERE" not in self.query.upper() else "AND"
            return f"{self.query} {where_keyword} {' AND '.join(conditions)}"

        return self.query

    def _update_state(self, rows: List[Dict[str, Any]]) -> None:
        """更新增量轮询状态"""
        if not rows:
            return

        if self.id_column:
            ids = [row.get(self.id_column) for row in rows if row.get(self.id_column)]
            if ids:
                self._last_id = max(self._last_id, max(ids))

        if self.timestamp_column:
            timestamps = [
                row.get(self.timestamp_column)
                for row in rows
                if row.get(self.timestamp_column)
            ]
            if timestamps:
                self._last_timestamp = max(
                    self._last_timestamp or datetime.min.replace(tzinfo=timezone.utc),
                    max(timestamps)
                )

    def poll(self) -> int:
        """执行一次轮询

        Returns:
            采集的记录数
        """
        query = self._build_incremental_query()
        logger.info(f"Executing query: {query[:100]}...")

        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                rows = [dict(row._mapping) for row in result]

                for row in rows:
                    event = {
                        "source_type": "jdbc",
                        "collector": "jdbc_poller",
                        "database": str(self.engine.url.database),
                        "collected_at": datetime.now(timezone.utc).isoformat(),
                        "data": row
                    }
                    self.producer.produce(
                        self.kafka_topic,
                        json.dumps(event, default=str)
                    )

                self._update_state(rows)
                self.producer.flush()

                count = len(rows)
                if count > 0:
                    logger.info(f"Polled {count} rows")
                return count

        except Exception as e:
            logger.error(f"Poll error: {e}")
            raise

    def run(self) -> None:
        """启动轮询循环"""
        logger.info(f"Starting JDBC poller (interval: {self.poll_interval}s)")

        # 设置信号处理器实现优雅退出
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        # 立即执行一次
        self.poll()

        # 定时执行
        schedule.every(self.poll_interval).seconds.do(self.poll)

        while self._running:
            schedule.run_pending()
            time.sleep(1)

        logger.info("JDBC poller stopped")

    def _shutdown(self, signum, frame) -> None:
        """优雅退出"""
        logger.info(f"Received signal {signum}, shutting down...")
        self._running = False


def load_config(config_path: str) -> Dict[str, Any]:
    """从 YAML 文件加载配置"""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description='JDBC Database Poller')
    parser.add_argument(
        '--config',
        required=True,
        help='Configuration YAML file path'
    )
    args = parser.parse_args()

    config = load_config(args.config)

    poller = JdbcPoller(
        connection_url=os.environ['DATABASE_URL'],
        query=config['query'],
        kafka_topic=config['kafka_topic'],
        kafka_bootstrap_servers=os.environ.get(
            'KAFKA_BOOTSTRAP_SERVERS',
            'localhost:9092'
        ),
        id_column=config.get('id_column'),
        timestamp_column=config.get('timestamp_column'),
        poll_interval_seconds=config.get('poll_interval_seconds', 60)
    )

    poller.run()


if __name__ == '__main__':
    main()
