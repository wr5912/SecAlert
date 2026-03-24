---
status: complete
phase: 01-foundation-ingestion
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md]
started: 2026-03-24T08:00:00Z
updated: 2026-03-24T09:07:00Z
---

## Current Test

[all complete]
expected: |
  Kill any running containers. Clear ephemeral state. Run `docker-compose up -d`.
  All 6 services (zookeeper, kafka, vector, elasticsearch, redis, postgres) boot without errors.
  `docker-compose ps` shows all services as "Up".

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running containers. Clear ephemeral state. Run `docker-compose up -d`. All 6 services (zookeeper, kafka, vector, elasticsearch, redis, postgres) boot without errors. `docker-compose ps` shows all services as "Up".
result: passed
note: "Elasticsearch 镜像已提前拉取；Vector 使用 timberio/vector:latest-alpine (0.19.0) 并修复配置适配旧版本语法；6/6 服务 healthy"

### 2. Vector Syslog Source
expected: Vector is configured to receive Suricata BSD syslog via TCP on port 514. TCP syslog client can connect and send test message.
result: passed
note: "TCP 514 端口监听正常，发送测试消息成功，Kafka topic raw-suricata 确认收到消息"

### 3. Kafka Topic Creation
expected: Running `kafka/create-topics.sh` creates topics raw-suricata and raw-firewall. Kafka can list topics.
result: passed
note: "raw-suricata (6 partitions, 7天 retention) 和 raw-firewall (6 partitions) 均已创建；Kafka 内部 offset topic 也正常"

### 4. Three-Tier Parser
expected: Parsing a Suricata EVE JSON alert through the parser pipeline produces OCSF-formatted output with correct field mappings.
result: passed
note: "Tier 1 模板匹配直接命中；alert_signature/severity/src_ip/dest_ip 等字段正确映射；OCSF 格式输出正常"

### 5. PostgreSQL Storage
expected: PostgreSQL can store and retrieve alert records with UUID primary key and JSONB raw_event field.
result: passed
note: "UUID 主键自动生成正常；JSONB raw_event/ocsf_event 存储和查询正常；INET 类型 IP 字段正常；GIN 索引正常"

### 6. Redis Deduplication
expected: First identical alert passes dedup check, second identical alert is deduplicated (Redis returns already-seen).
result: passed
note: "SET NX EX 去重逻辑正确；首次通过返回 False，二次重复返回 True；MD5 哈希 key 正常；24h 过期正常"

### 7. Test Data Generator
expected: Running `python tests/test_data_generator.py --count 5` produces 5 valid Suricata EVE JSON lines.
result: passed
note: "生成 5 条有效 Suricata EVE JSON 事件；alert/flow 类型混合正常；签名数据真实；支持 --host/--port 直传 Vector"

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
