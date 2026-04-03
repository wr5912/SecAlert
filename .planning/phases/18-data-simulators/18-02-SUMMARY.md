# Phase 18 Plan 02 Summary: DLQ 死信队列机制

**完成时间:** 2026-04-03
**状态:** ✅ Complete

## 执行摘要

实现了 SM-01 死信队列 (DLQ) 机制，包括 DLQ Topic 消费者、延迟重试、MinIO 归档和 REST API 管理接口。

## 任务执行记录

| # | 任务 | 状态 | 文件 |
|---|------|------|------|
| 1 | 创建 DLQ Topic 配置 | ✅ | kafka/create-topics.sh |
| 2 | 创建 DLQ Consumer 服务 | ✅ | src/collection/dlq/consumer.py |
| 3 | 创建 DLQ Redis 状态管理 | ✅ | consumer.py 内置 |
| 4 | 实现延迟重试机制 | ✅ | consumer.py 内置 |
| 5 | MinIO 归档 | ✅ | consumer.py 内置 |
| 6 | 告警通知 | ✅ | consumer.py 内置 |
| 7 | DLQ 重处理 API | ✅ | src/collection/dlq/api.py |
| 8 | 更新 docker-compose.yml | ✅ | docker-compose.yml |

## 新增/修改的文件

```
kafka/create-topics.sh                          # 修改: 添加 dlq-events topic
src/collection/dlq/
├── __init__.py               # 新增: DLQ 模块
├── consumer.py               # 新增: DLQ Consumer (重试、归档)
├── api.py                    # 新增: DLQ REST API
src/api/main.py               # 修改: 注册 DLQ router
Dockerfile.dlq                # 新增: DLQ Consumer Dockerfile
docker-compose.yml            # 修改: 添加 minio, dlq-consumer 服务
```

## DLQ API Endpoints

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/v1/dlq` | 列出 DLQ 消息 |
| GET | `/api/v1/dlq/{id}` | 查看详情 |
| POST | `/api/v1/dlq/{id}/reprocess` | 手动重处理 |
| POST | `/api/v1/dlq/reprocess-all` | 批量重处理 |
| GET | `/api/v1/dlq/stats` | DLQ 统计 |
| GET | `/api/v1/dlq/archived/{date}` | 查看归档 |
| DELETE | `/api/v1/dlq/{id}` | 删除消息 |

## 重试机制

| 重试次数 | 延迟 | 动作 |
|----------|------|------|
| 1 | 1 min | 重试解析 |
| 2 | 5 min | 重试解析 |
| 3 | 30 min | 重试解析 |
| 4+ | - | 归档到 MinIO |

## 技术决策

| 决策 | 说明 |
|------|------|
| Redis Sorted Set | 实现延迟重试队列，Score=重试时间戳 |
| Redis Hash | 存储 DLQ 消息详情，7天过期 |
| MinIO | S3 兼容存储，归档超过重试上限的消息 |
| DLQ Topic | 独立 Kafka topic，3 partitions |

## 下一步

- Phase 19: 采集可观测性监控 (SM-02)

---
*Phase: 18-data-simulators*
*Completed: 2026-04-03*
