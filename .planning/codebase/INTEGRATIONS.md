# INTEGRATIONS.md - External Integrations

## Data Sources

### Database Collection (JDBC)
| Database | Protocol | Notes |
|----------|---------|-------|
| 达梦 (DM) | JDBC | 国产数据库，port 5236 |
| TiDB | MySQL protocol | 国产分布式数据库 |
| openGauss | JDBC | 国产开源数据库 |
| Kingbase | JDBC | 国产数据库 |

### API/Webhook Collection
| Source | Type | Auth Method |
|--------|------|-------------|
| 云防火墙 | Webhook | HMAC SHA256 |
| 态势感知 | REST API | Bearer Token |
| SOC API | REST API | API Token polling |

### File/Syslog Collection
| Type | Protocol | Notes |
|------|----------|-------|
| Server Logs | file tail | JSON/LOG formats |
| Network Devices | Syslog TCP | UDP/TCP port 514 |

## Storage Systems

### Primary Storage
| System | Purpose | Connection |
|--------|---------|------------|
| Elasticsearch | Event storage + full-text search | HTTP/9200 |
| ClickHouse | OLAP analytics | Native client |
| Neo4j | Entity relationship graph | Bolt 7687 |
| MinIO | Raw log object storage | S3-compatible |

### Message Queue
| System | Purpose | Notes |
|--------|---------|-------|
| Kafka | Event streaming | Primary |
| Pulsar | Alternative streaming | Optional |

## AI Integration

### LLM Backend
| Component | Details |
|-----------|---------|
| Model | Qwen3-32B |
| Deployment | Offline/私有化部署 |
| Framework | vLLM |
| Access | Local inference only |

### DSPy Signatures
- `LogParserSignature` - Log parsing
- `AlertAnalyzerSignature` - Alert analysis
- `AttackChainSignature` - Attack chain reconstruction
- `RiskScoringSignature` - Risk assessment

## External Intelligence

### Threat Intel Sources (Planned)
- Malicious IP/域名 reputation lists
- CVE vulnerability database
- ATT&CK framework mapping

### Asset Information
- Hostname → IP mapping
- User → Department mapping
- Business system ownership

## API Interfaces

### REST API
- Alert CRUD operations
- Search and filtering
- Analytics endpoints

### gRPC (Planned)
- High-performance streaming
- Bidirectional streaming

### MCP Server (Planned)
- AI Agent integration
- Tool calling interface

## Collection Framework

**Vector** 作为统一采集框架:
```yaml
sources:
  - type: databases    # JDBC polling
  - type: http_server  # Webhook receiver
  - type: file         # Log files
  - type: syslog        # Network devices
```
