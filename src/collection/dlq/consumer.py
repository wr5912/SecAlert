"""
DLQ (Dead Letter Queue) 消费者服务

功能:
- 消费 dlq-events topic 中的解析失败消息
- 实现延迟重试机制 (1min / 5min / 30min)
- 超过重试上限后归档到 MinIO
- 发送告警通知

用法:
    python -m src.collection.dlq.consumer
"""

import json
import logging
import os
import signal
import time
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class DLQMessage:
    """DLQ 消息结构"""
    message_id: str
    original_event: dict
    error: str
    source: str
    retry_count: int = 0
    first_failure: str = None
    last_retry: Optional[str] = None
    status: str = "pending"  # pending, retrying, archived, reprocessed
    original_topic: str = "unknown"
    partition: int = -1
    offset: int = -1

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "DLQMessage":
        return cls(**data)


class DLQConsumer:
    """DLQ 消费者 - 处理解析失败的消息"""

    # 重试配置: (延迟秒数, 是否归档)
    RETRY_DELAYS = [
        (60, False),    # Retry 1: 1 min
        (300, False),   # Retry 2: 5 min
        (1800, False),  # Retry 3: 30 min
        (0, True),      # Archive after 3 retries
    ]

    def __init__(
        self,
        kafka_bootstrap: str = None,
        dlq_topic: str = "dlq-events",
        redis_url: str = None,
        minio_endpoint: str = None,
        minio_bucket: str = "secalert-dlq"
    ):
        self.kafka_bootstrap = kafka_bootstrap or os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
        self.dlq_topic = dlq_topic
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.minio_endpoint = minio_endpoint or os.getenv("MINIO_ENDPOINT", "localhost:9000")
        self.minio_bucket = minio_bucket
        self.minio_access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.minio_secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")

        self._consumer = None
        self._redis = None
        self._minio_client = None
        self._running = False
        self._retry_queue_key = "dlq:retry_queue"

    def _create_kafka_consumer(self):
        """创建 Kafka 消费者"""
        try:
            from confluent_kafka import Consumer, KafkaError
            self._consumer = Consumer({
                'bootstrap.servers': self.kafka_bootstrap,
                'group.id': 'secalert-dlq-consumer',
                'auto.offset.reset': 'earliest',
                'enable.auto.commit': False
            })
            self._consumer.subscribe([self.dlq_topic])
            logger.info(f"Kafka 消费者已连接: {self.kafka_bootstrap}, topic: {self.dlq_topic}")
            return True
        except ImportError:
            logger.warning("confluent-kafka 未安装，将使用模拟模式")
            self._consumer = None
            return False
        except Exception as e:
            logger.error(f"Kafka 连接失败: {e}")
            self._consumer = None
            return False

    def _create_redis_client(self):
        """创建 Redis 客户端"""
        try:
            import redis
            # 解析 redis:// URL
            redis_url = self.redis_url.replace("redis://", "")
            host_port = redis_url.split(":")
            host = host_port[0]
            port = int(host_port[1]) if len(host_port) > 1 else 6379

            self._redis = redis.Redis(host=host, port=port, decode_responses=True)
            self._redis.ping()
            logger.info(f"Redis 客户端已连接: {host}:{port}")
            return True
        except ImportError:
            logger.warning("redis 库未安装，Redis 功能不可用")
            self._redis = None
            return False
        except Exception as e:
            logger.error(f"Redis 连接失败: {e}")
            self._redis = None
            return False

    def _create_minio_client(self):
        """创建 MinIO 客户端"""
        try:
            from minio import Minio
            self._minio_client = Minio(
                self.minio_endpoint,
                access_key=self.minio_access_key,
                secret_key=self.minio_secret_key,
                secure=False
            )
            # 确保 bucket 存在
            if not self._minio_client.bucket_exists(self.minio_bucket):
                self._minio_client.make_bucket(self.minio_bucket)
            logger.info(f"MinIO 客户端已连接: {self.minio_endpoint}, bucket: {self.minio_bucket}")
            return True
        except ImportError:
            logger.warning("minio 库未安装，MinIO 归档功能不可用")
            self._minio_client = None
            return False
        except Exception as e:
            logger.error(f"MinIO 连接失败: {e}")
            self._minio_client = None
            return False

    def _parse_message(self, raw_value: bytes) -> Optional[dict]:
        """解析 Kafka 消息"""
        try:
            return json.loads(raw_value.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"消息解析失败: {e}")
            return None

    def _send_to_dlq(self, message: DLQMessage):
        """将消息发送到 DLQ topic"""
        if not self._consumer:
            logger.warning("Kafka 消费者未初始化，无法发送 DLQ")
            return

        try:
            from confluent_kafka import Producer
            producer = Producer({'bootstrap.servers': self.kafka_bootstrap})
            producer.produce(
                self.dlq_topic,
                key=message.message_id.encode('utf-8'),
                value=json.dumps(message.to_dict()).encode('utf-8')
            )
            producer.flush()
        except Exception as e:
            logger.error(f"发送 DLQ 消息失败: {e}")

    def _save_retry_queue(self, message: DLQMessage, next_retry_ts: float):
        """将消息添加到重试队列 (Redis Sorted Set)"""
        if not self._redis:
            logger.warning("Redis 不可用，跳过重试队列")
            return

        try:
            # Score = 下次重试时间戳
            self._redis.zadd(self._retry_queue_key, {message.message_id: next_retry_ts})
            logger.debug(f"消息 {message.message_id} 已添加到重试队列，下次重试: {next_retry_ts}")
        except Exception as e:
            logger.error(f"保存重试队列失败: {e}")

    def _process_retry_queue(self):
        """处理重试队列中的消息"""
        if not self._redis or not self._consumer:
            return

        try:
            # 获取所有到期的消息 (score <= now)
            now = time.time()
            message_ids = self._redis.zrangebyscore(self._retry_queue_key, 0, now)

            for message_id in message_ids:
                self._process_retry_message(message_id)

        except Exception as e:
            logger.error(f"处理重试队列失败: {e}")

    def _process_retry_message(self, message_id: str):
        """处理单条重试消息"""
        try:
            # 从 Redis 获取消息详情
            message_data = self._redis.hgetall(f"dlq:{message_id}")
            if not message_data:
                logger.warning(f"消息 {message_id} 不存在于 Redis")
                self._redis.zrem(self._retry_queue_key, message_id)
                return

            message = DLQMessage(
                message_id=message_id,
                original_event=json.loads(message_data.get("original_event", "{}")),
                error=message_data.get("error", ""),
                source=message_data.get("source", "unknown"),
                retry_count=int(message_data.get("retry_count", 0)),
                first_failure=message_data.get("first_failure"),
                last_retry=datetime.now(timezone.utc).isoformat(),
                status=message_data.get("status", "pending"),
                original_topic=message_data.get("original_topic", "unknown"),
                partition=int(message_data.get("partition", -1)),
                offset=int(message_data.get("offset", -1))
            )

            logger.info(f"重试消息 {message_id} (第 {message.retry_count + 1} 次)")

            # 尝试重新解析
            success = self._retry_parse(message)

            if success:
                # 解析成功，更新状态为 reprocessed
                message.status = "reprocessed"
                self._redis.hset(f"dlq:{message_id}", "status", "reprocessed")
                self._redis.zrem(self._retry_queue_key, message_id)
                logger.info(f"消息 {message_id} 重处理成功")
            else:
                # 解析失败，增加重试计数
                message.retry_count += 1

                if message.retry_count >= 3:
                    # 超过重试上限，归档
                    self._archive_message(message)
                else:
                    # 添加到下次重试队列
                    delay = self.RETRY_DELAYS[message.retry_count][0]
                    next_retry = time.time() + delay
                    self._redis.hset(f"dlq:{message_id}", mapping={
                        "retry_count": message.retry_count,
                        "last_retry": message.last_retry,
                        "status": "retrying"
                    })
                    self._redis.zadd(self._retry_queue_key, {message_id: next_retry})
                    logger.info(f"消息 {message_id} 重试失败，第 {message.retry_count} 次，{delay}s 后再试")

        except Exception as e:
            logger.error(f"处理重试消息 {message_id} 失败: {e}")

    def _retry_parse(self, message: DLQMessage) -> bool:
        """尝试重新解析消息"""
        try:
            from parser.pipeline import ThreeTierParser
            parser = ThreeTierParser()

            raw_log = message.original_event.get("raw", str(message.original_event))
            source_type = message.original_event.get("source_type", "unknown")

            result = parser.parse(raw_log, source_type)

            # 检查解析是否成功 (非 fallback)
            return result.get("parse_status") != "fallback"

        except Exception as e:
            logger.warning(f"重试解析异常: {e}")
            return False

    def _archive_message(self, message: DLQMessage):
        """归档消息到 MinIO"""
        message.status = "archived"

        if self._redis:
            self._redis.hset(f"dlq:{message_id}", "status", "archived")
            self._redis.zrem(self._retry_queue_key, message_id)

        if not self._minio_client:
            logger.warning("MinIO 不可用，仅标记为 archived 状态")
            return

        try:
            from minio.error import S3Error

            # 生成归档路径
            archive_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            object_name = f"dlq-archive/{archive_date}/{message.message_id}.json"
            meta_name = f"dlq-archive/{archive_date}/{message.message_id}.meta.json"

            # 归档内容
            archive_content = json.dumps(message.to_dict(), indent=2, ensure_ascii=False)
            metadata = {
                "message_id": message.message_id,
                "error": message.error,
                "retry_count": str(message.retry_count),
                "first_failure": message.first_failure,
                "archived_at": datetime.now(timezone.utc).isoformat(),
                "source": message.source
            }
            metadata_content = json.dumps(metadata, indent=2)

            # 上传到 MinIO
            self._minio_client.put_object(
                self.minio_bucket,
                object_name,
                archive_content.encode('utf-8'),
                len(archive_content)
            )
            self._minio_client.put_object(
                self.minio_bucket,
                meta_name,
                metadata_content.encode('utf-8'),
                len(metadata_content)
            )

            logger.info(f"消息 {message.message_id} 已归档到 MinIO: {object_name}")

            # 发送归档通知
            self._notify_archive(message)

        except S3Error as e:
            logger.error(f"MinIO 归档失败: {e}")
        except Exception as e:
            logger.error(f"归档消息失败: {e}")

    def _notify_archive(self, message: DLQMessage):
        """发送归档告警通知"""
        logger.warning(
            f"DLQ 归档告警: message_id={message.message_id}, "
            f"error={message.error}, retry_count={message.retry_count}"
        )

    def _save_dlq_message(self, message: DLQMessage):
        """保存 DLQ 消息到 Redis"""
        if not self._redis:
            return

        try:
            key = f"dlq:{message.message_id}"
            self._redis.hset(key, mapping={
                "message_id": message.message_id,
                "original_event": json.dumps(message.original_event, ensure_ascii=False),
                "error": message.error,
                "source": message.source,
                "retry_count": str(message.retry_count),
                "first_failure": message.first_failure or datetime.now(timezone.utc).isoformat(),
                "last_retry": message.last_retry or "",
                "status": message.status,
                "original_topic": message.original_topic,
                "partition": str(message.partition),
                "offset": str(message.offset)
            })
            # 设置 7 天过期
            self._redis.expire(key, 7 * 24 * 3600)
        except Exception as e:
            logger.error(f"保存 DLQ 消息失败: {e}")

    def _send_dlq_notification(self, count: int):
        """发送 DLQ 数量告警"""
        if count > 100:
            logger.warning(f"DLQ 告警: 消息数量 ({count}) 超过阈值 (100)")

    def start(self):
        """启动 DLQ 消费者"""
        logger.info("DLQ 消费者启动中...")
        self._running = True

        # 初始化客户端
        self._create_kafka_consumer()
        self._create_redis_client()
        self._create_minio_client()

        # 注册信号处理
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        messages_received = 0
        last_notification_time = time.time()

        try:
            while self._running:
                # 1. 处理重试队列
                self._process_retry_queue()

                # 2. 消费新消息
                if self._consumer:
                    msg = self._consumer.poll(timeout=1.0)

                    if msg is None:
                        continue

                    if msg.error():
                        logger.error(f"Kafka 错误: {msg.error()}")
                        continue

                    # 解析消息
                    data = self._parse_message(msg.value())
                    if data is None:
                        continue

                    # 创建 DLQ 消息
                    dlq_msg = DLQMessage(
                        message_id=str(uuid.uuid4()),
                        original_event=data.get("original_event", data),
                        error=data.get("error", "Unknown error"),
                        source=data.get("source", "unknown"),
                        retry_count=0,
                        first_failure=datetime.now(timezone.utc).isoformat(),
                        status="pending",
                        original_topic=msg.topic(),
                        partition=msg.partition(),
                        offset=msg.offset()
                    )

                    # 保存到 Redis
                    self._save_dlq_message(dlq_msg)

                    # 添加到重试队列 (1 min 后第一次重试)
                    next_retry = time.time() + self.RETRY_DELAYS[0][0]
                    self._save_retry_queue(dlq_msg, next_retry)

                    messages_received += 1
                    logger.info(f"收到 DLQ 消息: {dlq_msg.message_id}, 错误: {dlq_msg.error[:50]}...")

                    # 定期检查 DLQ 数量
                    if time.time() - last_notification_time > 60:
                        if self._redis:
                            dlq_count = self._redis.zcard(self._retry_queue_key)
                            self._send_dlq_notification(dlq_count)
                        last_notification_time = time.time()

                    # 手动提交 offset
                    self._consumer.commit(msg)

                else:
                    # 模拟模式: 每 5 秒处理一条
                    time.sleep(5)

        except Exception as e:
            logger.error(f"消费者循环异常: {e}")
        finally:
            self.stop()

        logger.info(f"DLQ 消费者已停止. 总计收到 {messages_received} 条消息")

    def stop(self):
        """停止消费者"""
        self._running = False
        if self._consumer:
            try:
                self._consumer.close()
                logger.info("Kafka 消费者已关闭")
            except Exception as e:
                logger.error(f"关闭消费者失败: {e}")

    def _signal_handler(self, signum, frame):
        """处理退出信号"""
        logger.info(f"收到信号 {signum}，准备停止...")
        self._running = False


def main():
    """主入口"""
    kafka_bootstrap = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
    dlq_topic = os.getenv("DLQ_TOPIC", "dlq-events")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    minio_endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    minio_bucket = os.getenv("MINIO_BUCKET", "secalert-dlq")

    logger.info(f"DLQ Consumer 配置:")
    logger.info(f"  Kafka: {kafka_bootstrap}, topic: {dlq_topic}")
    logger.info(f"  Redis: {redis_url}")
    logger.info(f"  MinIO: {minio_endpoint}/{minio_bucket}")

    consumer = DLQConsumer(
        kafka_bootstrap=kafka_bootstrap,
        dlq_topic=dlq_topic,
        redis_url=redis_url,
        minio_endpoint=minio_endpoint,
        minio_bucket=minio_bucket
    )

    consumer.start()


if __name__ == "__main__":
    main()
