# CONCERNS.md - Technical Concerns & Risks

## Current Project Status

**Greenfield Project**: No source code implemented yet. This document tracks anticipated concerns based on the implementation plan.

## High Priority Concerns

### 1. LLM Parsing Accuracy

**Concern**: DSPy + Qwen3-32B may produce incorrect regex patterns or field mappings, leading to parsing errors.

**Mitigation**:
- Multi-tier parsing (Template → Drain → LLM)
- Feedback loop with human review
- Only deploy high-confidence (>0.8) parsers to production

### 2. DSPy Self-Iteration Reliability

**Concern**: The MIPRO optimization feedback loop may not converge or could degrade over time.

**Mitigation**:
- Minimum 20+高质量反馈 before triggering compilation
- Version control for compiled programs
- Rollback mechanism to previous known-good version

### 3. 国产数据库 JDBC Compatibility

**Concern**: 达梦/TiDB/Kingbase JDBC drivers may have edge cases or CDC limitations.

**Status**: Phase 1 uses JDBC polling (not CDC)
**Mitigation**:
- Incremental query with timestamp checkpoints
- Comprehensive error handling for connection failures

## Medium Priority Concerns

### 4. Scalability of Real-time Processing

**Concern**: Flink may become bottleneck with 100k+ alerts/day.

**Metrics to Monitor**:
- Kafka consumer lag
- Flink job latency (P99 < 100ms target)
- Elasticsearch indexing rate

### 5. Storage Tier Coordination

**Concern**: Maintaining consistency across Elasticsearch (events), Neo4j (graphs), and ClickHouse (aggregations).

**Architecture**: Elasticsearch is source of truth; Neo4j and ClickHouse are derived views.

### 6. Hook/Agent Permission Issues

**Issue**: Subagent hooks blocking Bash/file operations in some environments.

**Status**: Observed in current environment
**Impact**: Limits parallel agent execution

## Technical Debt (Anticipated)

### Phase 1 Debt
| Item | Description | Impact |
|------|-------------|--------|
| JDBC polling interval | Real-time latency from polling-based collection | Medium latency for DB sources |
| Single Flink job | No job isolation between rule types | Operational risk |

### Phase 2 Debt
| Item | Description | Impact |
|------|-------------|--------|
| Parser cache invalidation | No automatic invalidation when log format changes | Stale parsers |
| Manual ATT&CK mapping | Rules require manual technique mapping | Maintenance overhead |

## Security Considerations

### Data Security
- All inference runs on private Qwen3-32B (no external API calls)
- Kafka/存储 supports TLS encryption
- Secrets via environment variables, not in config files

### Input Validation
- All ingested logs must be validated before parsing
- OCSF schema validation for normalized events
- SQL injection prevention for JDBC queries

### Network Security
- Internal network segmentation assumed
- mTLS between microservices (future)

## Performance Targets

| Metric | Target |
|--------|--------|
| Log parsing throughput | >10,000 logs/sec (Drain), >1,000 logs/sec (LLM fallback) |
| Alert processing latency | P99 < 100ms (stream), P95 < 1s (batch) |
| LLM inference latency | <2s per parse request |
| Attack chain reconstruction | <5s for 100-event chain |

## Fragile Areas

### Areas Requiring Careful Implementation
1. **Parser Registry** - Version management and rollback
2. **Feedback Loop** - Automatic vs manual compilation trigger
3. **Graph Entity Linking** - IP/User/Host correlation accuracy
4. **Drain Algorithm** - Template explosion with high variable logs

### Known External Dependencies
| Dependency | Risk | Mitigation |
|------------|------|------------|
| Qwen3-32B model | Model availability | Offline deployment |
| Flink checkpointing | State recovery | Persistent storage backend |
| Neo4j/ClickHouse | Data consistency | Eventual consistency model |

## Monitoring & Observability

### Key Metrics
- Ingestion rate (logs/sec)
- Parse success rate (structured vs unstructured)
- Alert correlation count
- LLM confidence distribution
- Storage disk usage

### Alerting Thresholds
- Parse failure rate > 5%
- Consumer lag > 10,000 messages
- LLM latency > 10s
