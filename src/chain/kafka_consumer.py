"""
Kafka 告警消费者 - Phase 1 → Phase 2 数据管道桥接器

从 Kafka 消费解析后的告警事件，喂送到 AlertCorrelator 进行关联分析。
此脚本解决 Parser 输出到 PostgreSQL 后没有消费者调用 AlertCorrelator.add_alert() 的问题。

用法:
    python -m src.chain.kafka_consumer
"""

import json
import logging
import signal
import sys
import os
from datetime import datetime
from typing import Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AlertConsumer:
    """
    告警消费者 - 桥接 Phase 1 Parser 输出与 Phase 2 AlertCorrelator

    从 Kafka 消费告警事件，将 OCSF 格式的告警喂送给关联器进行关联分析。
    """

    def __init__(
        self,
        kafka_bootstrap_servers: str = "localhost:9092",
        kafka_topic: str = "raw-events",
        group_id: str = "secalert-correlator"
    ):
        self.kafka_bootstrap_servers = kafka_bootstrap_servers
        self.kafka_topic = kafka_topic
        self.group_id = group_id
        self._consumer = None
        self._correlator = None
        self._running = False

    def _create_correlator(self):
        """延迟创建关联器实例"""
        if self._correlator is None:
            from src.chain.engine.correlator import AlertCorrelator
            self._correlator = AlertCorrelator()
            logger.info("AlertCorrelator 初始化完成")
        return self._correlator

    def _create_consumer(self):
        """创建 Kafka 消费者"""
        if self._consumer is None:
            try:
                from confluent_kafka import Consumer, KafkaError
                self._consumer = Consumer({
                    'bootstrap.servers': self.kafka_bootstrap_servers,
                    'group.id': self.group_id,
                    'auto.offset.reset': 'earliest',
                    'enable.auto.commit': True
                })
                self._consumer.subscribe([self.kafka_topic])
                logger.info(f"Kafka 消费者已连接: {self.kafka_bootstrap_servers}, topic: {self.kafka_topic}")
            except ImportError:
                logger.warning("confluent-kafka 未安装，将使用模拟模式")
                self._consumer = None
            except Exception as e:
                logger.error(f"Kafka 连接失败: {e}")
                self._consumer = None
        return self._consumer

    def _parse_message(self, msg_value: bytes) -> Optional[dict]:
        """解析 Kafka 消息为 OCSF 告警格式"""
        try:
            data = json.loads(msg_value.decode('utf-8'))
            return data
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"消息解析失败: {e}")
            return None

    def start(self):
        """启动消费者循环"""
        logger.info("告警消费者启动中...")
        self._running = True

        # 注册信号处理
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        consumer = self._create_consumer()
        correlator = self._create_correlator()

        if consumer is None:
            logger.error("无法创建 Kafka 消费者，退出")
            return

        messages_processed = 0
        alerts_processed = 0
        groups_found = 0

        try:
            while self._running:
                msg = consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        logger.debug(f"分区 {msg.partition()} 到达末尾")
                    else:
                        logger.error(f"Kafka 错误: {msg.error()}")
                    continue

                # 解析消息
                alert = self._parse_message(msg.value())
                if alert is None:
                    continue

                messages_processed += 1

                # 喂送给关联器
                try:
                    groups = correlator.add_alert(alert)
                    alerts_processed += 1
                    groups_found += len(groups)

                    if groups:
                        logger.info(f"发现 {len(groups)} 个关联组: {[g.group_id for g in groups]}")

                except Exception as e:
                    logger.error(f"处理告警失败: {e}")

                if messages_processed % 100 == 0:
                    logger.info(f"进度: 已处理 {messages_processed} 条消息, {alerts_processed} 条告警, {groups_found} 个关联组")

        except Exception as e:
            logger.error(f"消费者循环异常: {e}")
        finally:
            self.stop()

        logger.info(f"消费者已停止. 总计: {messages_processed} 消息, {alerts_processed} 告警, {groups_found} 关联组")

    def stop(self):
        """停止消费者"""
        self._running = False
        if self._consumer:
            try:
                self._consumer.close()
                logger.info("Kafka 消费者已关闭")
            except Exception as e:
                logger.error(f"关闭消费者失败: {e}")
        self._consumer = None

    def _signal_handler(self, signum, frame):
        """处理退出信号"""
        logger.info(f"收到信号 {signum}，准备停止...")
        self._running = False


def main():
    """主入口"""
    kafka_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    kafka_topic = os.getenv("KAFKA_TOPIC", "raw-events")
    group_id = os.getenv("KAFKA_GROUP_ID", "secalert-correlator")

    logger.info(f"Kafka 配置: {kafka_servers}, topic: {kafka_topic}, group: {group_id}")

    consumer = AlertConsumer(
        kafka_bootstrap_servers=kafka_servers,
        kafka_topic=kafka_topic,
        group_id=group_id
    )

    consumer.start()


if __name__ == "__main__":
    main()
