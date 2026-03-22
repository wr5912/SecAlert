# ARCHITECTURE.md - System Architecture

## Architecture Pattern

**Layered Architecture** with stream processing core:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           数据采集层 (Collector)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  数据库插件   │  │  API 插件    │  │ 文件/Syslog │                 │
│  │  达梦/TiDB   │  │  REST/Webhook│  │  日志文件   │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                           │                                              │
│                           ↓                                              │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    Vector 统一采集框架                             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           解析层 (Parser Layer)                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  第一层：预置模板匹配（主流设备 50+）                              │ │
│  └─────────────────────────────────┬───────────────────────────────────┘ │
│                                    ↓ 未命中                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  第二层：Drain 聚类（高速流处理，100万行/秒）                       │ │
│  └─────────────────────────────────┬───────────────────────────────────┘ │
│                                    ↓ 无法解析                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  第三层：DSPy + Qwen3-32B（LLM 生成解析器）                        │ │
│  │  - 签名驱动  - 编译优化  - 反馈自迭代                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           流处理层 (Stream Processing)                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Kafka / Pulsar 消息队列                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Flink 流处理引擎                               │   │
│  │  规则检测  ·  告警收敛  ·  实体关联  ·  时序聚合                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           存储层 (Storage)                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │ Elasticsearch│  │ ClickHouse │  │   Neo4j    │  │   MinIO    │     │
│  │  全文检索   │  │  聚合分析   │  │  实体关系  │  │  原始日志  │     │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           分析层 (Analysis)                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                       │
│  │  规则引擎   │  │  图查询     │  │  AI 辅助   │                       │
│  │  YAML 配置  │  │  Cypher    │  │  DSPy 驱动 │                       │
│  └────────────┘  └────────────┘  └────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
原始数据
    │
    ├─→ [数据库] ──JDBC查询──→ Vector ──┐
    │                                       │
    ├─→ [API] ─────REST/Webhook─────→ Vector ──┤
    │                                       │
    └─→ [文件/Syslog] ──文件采集/Syslog──→ Vector ──┘
                                                    │
                                                    ↓
                                           ┌───────────────┐
                                           │     Kafka     │
                                           └───────┬───────┘
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        ↓                          ↓                          ↓
               ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
               │  实时分析分支   │        │  离线分析分支   │        │  原始存储分支   │
               │  (Flink)      │        │  (ClickHouse) │        │  (MinIO)     │
               └───────┬───────┘        └───────────────┘        └───────────────┘
                       │
                       ↓
              ┌─────────────────┐
              │  Elasticsearch  │
              │  + Neo4j        │
              │  (检索 + 关系图) │
              └─────────────────┘
```

## Layer Responsibilities

### Collection Layer (Collector)
- Unified collection via Vector framework
- Source-specific adapters (JDBC, REST, file, syslog)
- Protocol conversion to Kafka

### Parser Layer
- Three-tier parsing: Template → Drain → DSPy/LLM
- Parser registry with versioning
- Self-iteration feedback loop

### Stream Processing Layer
- Flink-based real-time processing
- Alert correlation and aggregation
- Entity linking and temporal analysis

### Storage Layer
- Elasticsearch: Search and retrieval
- ClickHouse: OLAP aggregations
- Neo4j: Entity relationship graphs
- MinIO: Raw log archive

### Analysis Layer
- Rule engine for signature detection
- Graph queries for attack path analysis
- DSPy AI for complex analysis tasks

## Key Abstractions

### DSPy Unified AI Framework
```
┌─────────────────────────────────────────────────────────────┐
│                    Signature 层 (任务定义)                   │
│  LogParserSig · AlertAnalyzerSig · AttackChainSig · RiskScoringSig
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Program 层 (模型调用)                    │
│  LogParserProgram · AlertAnalyzerProgram · AttackChainProgram
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Optimizer 层 (自动优化)                  │
│                    MIPRO 编译 + 反馈自迭代                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Model (Four Layers)
| Layer | Content | Storage |
|-------|---------|---------|
| Raw | 原始日志全文 | MinIO |
| Normalized | OCSF/ECS 格式 | Elasticsearch |
| Enriched | +威胁情报 +ATT&CK | Elasticsearch |
| Graph | 实体关系 + 时序链 | Neo4j |

## Entry Points

| Component | Entry Point | Purpose |
|-----------|-------------|---------|
| Vector | Configuration YAML | Data ingestion |
| Kafka | Topic: `raw-events` | Message intake |
| Flink | Stream processing job | Real-time analysis |
| API | FastAPI/gRPC endpoints | External access |
| MCP | Server port | AI Agent integration |
