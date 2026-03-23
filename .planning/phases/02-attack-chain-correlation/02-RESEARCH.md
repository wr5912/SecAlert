# Phase 2: Attack Chain Correlation - Research

**Researched:** 2026-03-23
**Domain:** Alert correlation engine, graph-based attack chain storage, ATT&CK mapping, dynamic time window algorithms
**Confidence:** MEDIUM (architectural patterns from training data; specific library choices and versions verified from package registries; dynamic window algorithm needs production tuning)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **关联引擎：** 规则引擎为主，Qwen3-32B 只在规则无法判断时兜底
2. **UI 配置：** 关联指标默认隐藏，仅专家模式可配置
3. **Source IP 关联：** IP 相同 + ATT&CK 攻击阶段逻辑合理才关联（非简单 IP 相同就关联）
4. **目标资产匹配：** IP 相同优先，主机名相同为辅助（适应 DHCP 环境）
5. **攻击类型关联：** 相同攻击类型 + 相同目标 = 关联
6. **最小告警数：** >= 2 条告警才能形成攻击链
7. **窗口策略：** 动态窗口（按告警频率自适应）
   - 短时大量同类告警 → 缩短窗口（如暴力破解 5min）
   - 零星告警 → 延长窗口（如后门 24h）
   - 固定备选窗口：1 小时
8. **存储：** Neo4j 图数据库
   - 节点 = 告警，边 = 关联关系（IP 关联、资产关联、攻击类型关联）
9. **展示：** 线性时间线为主，可展开查看分支
10. **元数据：** 最小集存储（链 ID、开始时间、告警数量、严重程度、状态），完整上下文按需查询
11. **ATT&CK 映射：** 规则 + LLM 混合
    - 所有已知告警类型走预置规则表映射到 ATT&CK
    - Qwen3-32B 仅在告警类型不在规则表时兜底推断
12. **映射层级：** 战术（Tactic）+ 技术（Technique）
13. **Phase 1 衔接：** Suricata 告警预置 ATT&CK 映射规则（由 Phase 1 的三层解析器输出告警类型后触发）
14. **验证标准：** 至少能对 Suricata 告警完成「告警→关联→攻击链」全流程

### Claude's Discretion (research and recommend)
- 动态窗口的具体频率阈值算法（短时/长时的边界值）
- 规则引擎的关联条件组合 DSL 语法
- ATT&CK 规则映射表的具体格式和维护流程
- Neo4j 图谱的具体 schema 设计
- 分支展开的 UI 交互细节

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

## Summary

Phase 2 builds an attack chain correlation engine on top of Phase 1's parsed OCSF alerts. The system correlates related alerts across time and devices using a rule-based engine with dynamic time windows, stores results as a graph in Neo4j, and provides timeline visualization with ATT&CK technique mapping.

**Primary recommendation:** Use neo4j 5.x driver with a hybrid correlation approach — Flink for real-time windowing and aggregation, neo4j for graph storage, and pyattck 7.1.2 for ATT&CK mapping. Start with Suricata alerts as the proof-of-concept, pre-seed ATT&CK rules for common Suricata signatures.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| CHAIN-01 | 系统能还原攻击链，呈现完整的攻击路径 | Neo4j graph schema, correlation rule DSL, dynamic window algorithm, ATT&CK mapping approach |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| neo4j | 5.28.3 | Python driver for Neo4j graph DB | Official Neo4j driver, actively maintained |
| pyattck | 7.1.2 | ATT&CK framework Python API | Comprehensive ATT&CK 16.1 coverage, MITRE maintained |
| attackcti | 0.5.4 | Threat intel CTI library | STIX/TAXII compatible, alternate ATT&CK source |
| confluent-kafka | 2.13.2 | Kafka consumer for Flink input | Already in use from Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| elasticsearch | 8.x/9.x | Alert storage (Phase 1 output) | Read alerts for correlation |
| psycopg2-binary | 2.9.10 | PostgreSQL access (Phase 1 output) | Alternative alert source |
| pydantic | 2.0+ | Data validation | Attack chain models |
| PyYAML | 6.0.3 | Correlation rule YAML config | DSL rules storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pyattck | attackcti | attackcti includes threat actor mappings; pyattck is simpler for technique-only lookup |
| neo4j driver | py2neo | py2neo is deprecated; neo4j official driver is actively maintained |
| Flink correlation | Polling PostgreSQL | Flink enables true real-time streaming; polling adds latency |

**Installation:**
```bash
pip install neo4j==5.28.3 pyattck==7.1.2 attackcti==0.5.4 confluent-kafka==2.13.2 elasticsearch pydantic PyYAML
```

**Version verification:** neo4j 5.28.3 (latest verified via pip), pyattck 7.1.2 (latest verified via pip), attackcti 0.5.4 (latest verified via pip).

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── chain/                      # 攻击链关联引擎
│   ├── engine/                 # 关联规则引擎
│   │   ├── correlator.py       # 主关联器
│   │   ├── rules/              # 关联规则 YAML 配置
│   │   │   ├── ip_rules.yaml   # IP 关联规则
│   │   │   ├── asset_rules.yaml# 资产关联规则
│   │   │   └── type_rules.yaml # 攻击类型关联规则
│   │   └── dsl.py              # 规则 DSL 解释器
│   ├── window/                 # 动态时间窗口
│   │   └── adaptive_window.py  # 按频率自适应的窗口
│   ├── attack_chain/           # 攻击链管理
│   │   ├── models.py           # Pydantic 攻击链模型
│   │   └── service.py          # 攻击链 CRUD 服务
│   └── mitre/                  # ATT&CK 映射
│       ├── mapper.py           # 规则 + LLM 混合映射器
│       └── rules.yaml          # 预置告警类型→ATT&CK 映射
├── graph/                      # Neo4j 图谱接口
│   ├── client.py              # Neo4j 客户端封装
│   └── queries/               # Cypher 查询模板
│       ├── chain_queries.cql  # 攻击链查询
│       └── correlation.cql    # 关联查询
├── flink/                      # Flink 流处理
│   └── correlation_job.py     # 实时关联 Flink Job
└── api/                        # 攻击链 API
    └── chain_endpoints.py     # FastAPI 攻击链接口
```

### Pattern 1: Hybrid ATT&CK Mapping (Rule + LLM Fallback)
**What:** Known alert types map via pre-seeded rules; unknown types use Qwen3-32B inference
**When to use:** All alert ATT&CK mapping
**Example:**
```python
class AttackChainMapper:
    """规则优先 + LLM 兜底的 ATT&CK 映射器"""

    def __init__(self, rule_table: dict, llm_fallback: bool = True):
        self.rule_table = rule_table  # {alert_type: {tactic, technique_id}}
        self.llm_fallback = llm_fallback
        self.llm_parser = LogParserProgram()  # DSPy program

    def map_to_attack(self, alert: dict) -> dict:
        alert_type = alert.get("event_type") or alert.get("alert_signature", "")

        # Layer 1: 预置规则查找
        if mapping := self.rule_table.get(alert_type):
            return {
                "tactic": mapping["tactic"],
                "technique_id": mapping["technique_id"],
                "technique_name": mapping["technique_name"],
                "confidence": 0.95,
                "source": "rule"
            }

        # Layer 2: LLM 兜底推断
        if self.llm_fallback:
            return self._llm_infer(alert, alert_type)

        return {"tactic": None, "technique_id": None, "confidence": 0.0}

    def _llm_infer(self, alert: dict, alert_type: str) -> dict:
        prompt = f"""分析以下告警，返回可能的 MITRE ATT&CK 战术和技术：
告警类型: {alert_type}
告警详情: {json.dumps(alert, ensure_ascii=False)}

只返回 JSON 格式：{{"tactic": "TA0001", "technique_id": "T1190", "technique_name": "Exploit Public-Facing Application"}}
"""
        # Qwen3-32B inference via vLLM
        result = llm_inference(prompt)
        return {"source": "llm", "confidence": 0.7, **parse_json(result)}
```

### Pattern 2: Dynamic Time Window Algorithm
**What:** Alert correlation window size adapts based on observed alert frequency
**When to use:** Real-time alert correlation
**Example:**
```python
from dataclasses import dataclass
from collections import deque
import time

@dataclass
class AdaptiveWindow:
    """按告警频率自适应的动态时间窗口"""
    base_window_seconds: int = 3600      # 固定备选窗口 1h
    min_window_seconds: int = 300        # 最短窗口 5min (暴力破解)
    max_window_seconds: int = 86400      # 最长窗口 24h (后门)
    burst_threshold: int = 10            # 短时大量告警阈值
    burst_window_seconds: int = 300      # 短时窗口（5min）内统计
    cooldown_multiplier: float = 0.5    # 冷却期窗口缩短系数

    def __post_init__(self):
        self._alert_history: deque = deque(maxlen=1000)  # 保留最近 1000 条时间戳

    def compute_window(self, now: float = None) -> int:
        """根据当前告警频率计算窗口大小"""
        now = now or time.time()
        window_start = now - self.base_window_seconds

        # 清理历史，只保留 base_window 秒内的
        while self._alert_history and self._alert_history[0] < window_start:
            self._alert_history.popleft()

        # 统计 base_window 内的告警数量
        recent_count = len(self._alert_history)

        # 统计 burst_window 内的告警数量（短时高频检测）
        burst_start = now - self.burst_window_seconds
        burst_count = sum(1 for t in self._alert_history if t >= burst_start)

        if burst_count >= self.burst_threshold:
            # 短时大量同类告警（如暴力破解），缩短窗口
            return self.min_window_seconds
        elif recent_count <= 2:
            # 零星告警（如后门），延长窗口
            return self.max_window_seconds
        else:
            # 正常情况，线性插值
            ratio = recent_count / 100  # 假设 100 条/窗口为中等密度
            window = int(self.base_window_seconds * (1.0 - ratio * 0.5))
            return max(self.min_window_seconds, min(self.max_window_seconds, window))

    def record_alert(self, timestamp: float = None):
        """记录一次告警到达"""
        self._alert_history.append(timestamp or time.time())
```

### Pattern 3: Neo4j Attack Chain Graph Schema
**What:** Store alerts as nodes, correlations as edges in Neo4j
**When to use:** Attack chain storage and visualization
**Cypher Schema:**
```cypher
// 节点类型
// :Alert — 单条告警
// :AttackChain — 攻击链根节点
// :Asset — 目标资产（IP/主机名）

// Alert 节点属性
// alert_id, timestamp, source_type, source_name, event_type,
// src_ip, dst_ip, severity, alert_signature, mitre_tactic,
// mitre_technique_id, mitre_technique_name, ocsf_event

// AttackChain 节点属性
// chain_id, start_time, end_time, alert_count, max_severity,
// status (active/resolved/false_positive), asset_ip

// 边类型（Relationships）
// (Alert)-[:CORRELATED_VIA_IP {window_seconds, confidence}]->(Alert)
// (Alert)-[:CORRELATED_VIA_ASSET {hostname_match, confidence}]->(Alert)
// (Alert)-[:CORRELATED_VIA_TYPE {attack_type, confidence}]->(Alert)
// (Alert)-[:PART_OF]->(AttackChain)
// (AttackChain)-[:TARGETS]->(Asset)

// 示例查询：查找某 IP 的完整攻击链
MATCH (chain:AttackChain)-[:TARGETS]->(a:Asset {ip: $target_ip})
MATCH path=(chain)<-[:PART_OF]-(alert:Alert)
RETURN chain, alert
ORDER BY alert.timestamp
```

### Pattern 4: Rule-Based Correlation Engine
**What:** Composite correlation rules combining IP match + ATT&CK stage logic
**When to use:** Primary correlation mechanism (replaces simple IP-only correlation)
**Example:**
```python
class CorrelationRule:
    """关联规则，支持复合条件"""

    def __init__(self, name: str, conditions: list[dict], min_alerts: int = 2):
        self.name = name
        self.conditions = conditions  # [{field, operator, value}]
        self.min_alerts = min_alerts

    def matches(self, alert_a: dict, alert_b: dict) -> tuple[bool, float]:
        """
        检查两条告警是否满足关联条件
        返回 (是否关联, 置信度)
        """
        satisfied = 0
        weights = []

        for cond in self.conditions:
            field = cond["field"]
            op = cond["operator"]
            value = cond["value"]
            weight = cond.get("weight", 1.0)

            val_a = alert_a.get(field)
            val_b = alert_b.get(field)

            if op == "equals" and val_a == val_b:
                satisfied += weight
            elif op == "same_ip_pair" and val_a == val_b:
                satisfied += weight
            elif op == "same_attack_type" and val_a == val_b:
                satisfied += weight
            elif op == "att&ck_stage_progression":
                # 验证 ATT&CK 阶段是否合理（如扫描→利用→权限提升）
                if self._valid_attack_progression(val_a, val_b):
                    satisfied += weight

            weights.append(weight)

        total_weight = sum(weights)
        confidence = satisfied / total_weight if total_weight > 0 else 0.0

        return satisfied >= total_weight * 0.5, confidence

# YAML 规则配置示例
# rules/ip_attack_chain.yaml
# rules:
#   - name: "端口扫描横向移动"
#     conditions:
#       - field: src_ip
#         operator: equals
#         value: "${alert.src_ip}"
#         weight: 1.0
#       - field: event_type
#         operator: "att&ck_stage_progression"
#         value: "reconnaissance->lateral_movement"
#         weight: 2.0
#     min_alerts: 3
```

### Pattern 5: Flink Real-Time Correlation Job
**What:** Flink streaming job for windowed alert aggregation and correlation
**When to use:** Real-time correlation of incoming alert streams
**Example (simplified):**
```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.common import Time
from pyflink.common.watermark_strategy import WatermarkStrategy

class AlertCorrelationJob:
    def __init__(self, kafka_bootstrap: str, neo4j_uri: str):
        self.env = StreamExecutionEnvironment.get_execution_environment()
        self.kafka_bootstrap = kafka_bootstrap
        self.neo4j = Neo4jClient(neo4j_uri)

    def build_job(self):
        # 从 Kafka 消费 Phase 1 解析后的告警
        alerts = self.env.add_source(
            KafkaSource.builder()
                .set_bootstrap_servers(self.kafka_bootstrap)
                .set_topics("parsed-alerts")  # Phase 1 解析后的 topic
                .set_group_id("chain-correlator")
                .build()
        )

        # 5分钟滚动窗口，用于短时高频检测（暴力破解等）
        burst_window = alerts.key_by(lambda a: a["src_ip"]) \
            .window(TumblingEventTimeWindows.of(Time.minutes(5)))

        # 1小时滚动窗口，用于一般关联
        general_window = alerts.key_by(lambda a: a["src_ip"]) \
            .window(TumblingEventTimeWindows.of(Time.hours(1)))

        # 窗口内聚合 → 关联检测 → 写入 Neo4j
        burst_stream = burst_window.reduce(self._reduce_alerts)
        general_stream = general_window.reduce(self._reduce_alerts)

        # 写入 Neo4j
        burst_stream.add_sink(self._write_to_neo4j)
        general_stream.add_sink(self._write_to_neo4j)

    def _reduce_alerts(self, a1: dict, a2: dict) -> dict:
        """合并同一窗口内的告警"""
        return {
            "window_key": a1["src_ip"],
            "alerts": [a1, a2],
            "count": a1.get("count", 1) + a2.get("count", 1),
            "first_seen": min(a1["timestamp"], a2["timestamp"]),
            "last_seen": max(a1["timestamp"], a2["timestamp"])
        }
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ATT&CK mapping | Custom technique lookup | pyattck 7.1.2 | Includes full ATT&CK 16.1 matrix, handles updates |
| Graph storage | Custom graph DB | Neo4j 5.x | Purpose-built for relationship queries, Cypher is expressive for chain traversal |
| Dynamic window | Hard-coded fixed windows | Adaptive algorithm | Attack patterns vary widely; brute force needs 5min, APT needs days |
| Time-series aggregation | Raw SQL window functions | Flink streaming | Flink handles event-time semantics, watermarks, late data correctly |

**Key insight:** Attack chain correlation is a well-studied problem in security operations. Pre-built frameworks (ATT&CK), graph databases (Neo4j), and streaming engines (Flink) handle the hard parts. Building custom solutions for technique mapping or graph queries introduces subtle bugs and misses edge cases.

---

## Runtime State Inventory

> This section is NOT applicable to Phase 2 - it is a feature-building phase with no rename/refactor/migration. All state is newly created by this phase.

**Stored data:** None — Phase 2 creates new Neo4j graph data; no pre-existing databases modified
**Live service config:** None — no external services configured prior to this phase
**OS-registered state:** None — no OS-level registrations (Task Scheduler, pm2, etc.)
**Secrets/env vars:** None — no pre-existing secrets for this phase
**Build artifacts:** None — no installed packages or built artifacts prior to Phase 2

---

## Common Pitfalls

### Pitfall 1: Neo4j Write Contention Under High Alert Volume
**What goes wrong:** Many concurrent alert correlations writing to Neo4j cause lock contention
**Why it happens:** Neo4j uses write locks; high-frequency alerts create many simultaneous writes to same chain
**How to avoid:** Batch writes with periodic commit (every N alerts or T seconds); use write buffering
**Warning signs:** Neo4j transaction timeouts, `LockClient` wait times > 100ms

### Pitfall 2: Window Size Misconfiguration Causes Chain Fragmentation
**What goes wrong:** Attack chains split into multiple chains because window is too short
**Why it happens:** Fixed window doesn't match attack pattern; dynamic window thresholds not tuned
**How to avoid:** Start with conservative defaults (1h window); monitor chain length distribution; tune dynamic thresholds
**Warning signs:** Many chains with only 2 alerts; chains ending abruptly mid-attack

### Pitfall 3: ATT&CK Mapping Rules Incomplete for New Alert Types
**What goes wrong:** Unknown alert types get null ATT&CK mapping, reducing analyst value
**Why it happens:** Rule table only covers known device types; LLM fallback not triggered correctly
**How to avoid:** Seed comprehensive rules for Suricata (Phase 2 scope); implement fallback logging to catch missing mappings
**Warning signs:** High ratio of alerts with `mitre_technique_id: null`; growing "unmapped" list in logs

### Pitfall 4: Flink Job Fails to Handle Late Arriving Alerts
**What goes wrong:** Alerts arriving after window closes are silently dropped
**Why it happens:** Default Flink watermark strategy drops late events
**How to avoid:** Configure `allowed_lateness` with gap (e.g., 5 minutes); send late events to dead-letter queue
**Warning signs:** Alerts missing from chains; gaps in timeline visualization

### Pitfall 5: Graph Query Performance Degrades with Chain Count
**What goes wrong:** Cypher queries slow down as attack chains accumulate
**Why it happens:** Missing indexes on `chain_id`, `start_time`, `status`; full graph scans
**How to avoid:** Create indexes on frequently queried properties; paginate chain listing queries
**Warning signs:** Cypher query time > 100ms; Neo4j CPU consistently high

---

## Code Examples

### Neo4j Alert Insert with Correlation Edges
```python
from neo4j import GraphDatabase

class Neo4jAttackChainStore:
    def __init__(self, uri: str, username: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def insert_alert_with_correlation(self, alert: dict, chain_id: str = None) -> str:
        """将告警写入 Neo4j，建立关联边"""
        with self.driver.session() as session:
            # 创建 Alert 节点
            session.run("""
                MERGE (a:Alert {alert_id: $alert_id})
                SET a.timestamp = datetime($timestamp),
                    a.src_ip = $src_ip,
                    a.dst_ip = $dst_ip,
                    a.event_type = $event_type,
                    a.severity = $severity,
                    a.alert_signature = $alert_signature,
                    a.mitre_tactic = $mitre_tactic,
                    a.mitre_technique_id = $mitre_technique_id
            """, **alert)

            # 如果存在链，加入链
            if chain_id:
                session.run("""
                    MATCH (a:Alert {alert_id: $alert_id})
                    MATCH (c:AttackChain {chain_id: $chain_id})
                    MERGE (a)-[:PART_OF]->(c)
                """, alert_id=alert["alert_id"], chain_id=chain_id)

            return alert["alert_id"]

    def create_attack_chain(self, chain_data: dict) -> str:
        """创建新的攻击链"""
        with self.driver.session() as session:
            result = session.run("""
                CREATE (c:AttackChain {
                    chain_id: randomUUID(),
                    start_time: datetime($start_time),
                    alert_count: $alert_count,
                    max_severity: $max_severity,
                    status: 'active',
                    asset_ip: $asset_ip
                })
                RETURN c.chain_id as chain_id
            """, **chain_data)
            return result.single()["chain_id"]
```

### pyattck ATT&CK Technique Lookup
```python
from pyattck import Attckck

attck = Attckck()

# 查找特定 technique
for technique in attck.enterprise.techniques:
    if technique.id == "T1190":  # Exploit Public-Facing Application
        print(f"Tactic: {[t.name for t in technique.tactics]}")
        print(f"Name: {technique.name}")
        print(f"Description: {technique.description}")

# 查找所有可用于特定告警类型的 techniques
# 假设告警是 "SQL injection attempt"
for technique in attck.enterprise.techniques:
    if "sql" in technique.name.lower() or "injection" in technique.name.lower():
        print(f"{technique.id}: {technique.name}")
```

### Dynamic Window with Frequency Tracking
```python
import time
from collections import deque
from dataclasses import dataclass

@dataclass
class FrequencyStats:
    """告警频率统计"""
    total_count: int = 0
    window_seconds: int = 3600
    buckets: deque = None

    def __post_init__(self):
        self.buckets = deque(maxlen=100)

    def record(self, timestamp: float = None):
        ts = timestamp or time.time()
        self.buckets.append(ts)
        self.total_count += 1

    def rate_per_minute(self) -> float:
        """计算当前告警速率（条/分钟）"""
        cutoff = time.time() - 60
        recent = sum(1 for t in self.buckets if t >= cutoff)
        return recent

# 自适应窗口使用示例
stats = FrequencyStats()
window = AdaptiveWindow()

for alert in incoming_alerts():
    stats.record(alert["timestamp"])
    current_window = window.compute_window()

    if stats.rate_per_minute() >= 10:  # 10 条/分钟 → 短时高频
        window_size = window.min_window_seconds  # 5 分钟
    else:
        window_size = window.max_window_seconds  # 24 小时
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual alert correlation (analyst experience) | Rule-based + graph DB automated correlation | ~2018+ | Scales to 30K+ alerts/day |
| Flat alert tables (PostgreSQL) | Graph representation (Neo4j) | ~2019+ | Enables multi-hop relationship queries |
| Static time windows | Dynamic/adaptive windows | ~2020+ | Reduces both false negatives (APT) and false positives (noise) |
| Siloed ATT&CK mapping | Automated technique extraction via rules + LLM | ~2023+ | Reduces analyst workload, enables faster coverage |

**Deprecated/outdated:**
- Manual alert correlation via SIEM search: Does not scale for 30K+ daily alerts
- Flat SQL queries for chain traversal: O(n) complexity vs O(1) for graph queries
- Static correlation rules without context: High false positive rate

---

## Open Questions

1. **动态窗口频率阈值边界值**
   - What we know: Burst threshold 10 alerts / 5min for brute force; max window 24h for backdoor
   - What's unclear: Exact thresholds for other attack types (reconnaissance, data exfiltration)
   - Recommendation: Start with conservative defaults, collect metrics, tune per attack category

2. **Neo4j Schema 初始容量规划**
   - What we know: Neo4j stores alerts as nodes, correlations as edges
   - What's unclear: Index strategy for 30K+ daily alerts; whether to partition by time period
   - Recommendation: Create indexes on `timestamp`, `src_ip`, `chain_id`; partition by month if chains span long periods

3. **Flink vs Kafka Streams vs 独立关联服务**
   - What we know: Architecture calls for Flink, but Phase 1 uses Kafka Consumer Group polling
   - What's unclear: Whether to introduce Flink now or continue with polling-based correlation
   - Recommendation: For Phase 2 scope (Suricata proof-of-concept), use polling-based Python correlator with threading; evaluate Flink when scaling to multi-device

4. **LLM 兜底调用的频率控制**
   - What we know: Qwen3-32B used for ATT&CK mapping when rule table misses
   - What's unclear: How to batch LLM calls to avoid per-alert inference overhead
   - Recommendation: Queue unmapped alerts; batch LLM inference every N alerts or T seconds

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neo4j | Attack chain graph storage | Unknown | — | Use embedded Neo4j for dev |
| Elasticsearch | Alert retrieval (Phase 1) | Unknown | 8.11.0 (from STATE.md) | PostgreSQL |
| PostgreSQL | Alert storage (Phase 1) | Unknown | — | Elasticsearch |
| Kafka | Alert stream input | Unknown | 7.5.0 (Confluent) | Direct polling |
| Qwen3-32B | LLM fallback | Unknown | — | Rule-only mapping |

**Missing dependencies with no fallback:**
- None identified yet — Phase 1 components should be available per Docker Compose

**Missing dependencies with fallback:**
- Flink: If not available, use Python threading-based correlator (lower performance but simpler setup)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python standard) |
| Config file | `pytest.ini` or `pyproject.toml` (inherited from Phase 1) |
| Quick run command | `pytest tests/test_chain/ -x -v` |
| Full suite command | `pytest tests/ --tb=short` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAIN-01 | Alert correlation by shared indicators | Unit | `pytest tests/test_chain/test_correlator.py -x` | No |
| CHAIN-01 | Attack chain timeline reconstruction | Unit | `pytest tests/test_chain/test_chain_reconstruction.py -x` | No |
| CHAIN-01 | ATT&CK technique mapping | Unit | `pytest tests/test_chain/test_attck_mapper.py -x` | No |
| CHAIN-01 | Chain detail view with metadata | Integration | `pytest tests/test_chain/test_chain_api.py -x` | No |

### Sampling Rate
- **Per task commit:** `pytest tests/test_chain/ -x`
- **Per wave merge:** `pytest tests/ --tb=short`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_chain/` directory does not exist — create for Phase 2 tests
- [ ] `tests/test_chain/test_correlator.py` — covers correlation logic
- [ ] `tests/test_chain/test_attck_mapper.py` — covers ATT&CK mapping
- [ ] `tests/test_chain/test_chain_reconstruction.py` — covers chain building from alerts
- [ ] `tests/conftest.py` — shared fixtures (Neo4j test client, mock alerts)
- [ ] `rules/attck_suricata.yaml` — pre-seeded Suricata signature to ATT&CK mapping

---

## Sources

### Primary (HIGH confidence — version numbers verified from package registries)
- `pip index versions neo4j` — verified neo4j 5.28.3 is latest
- `pip index versions pyattck` — verified pyattck 7.1.2 is latest
- `pip index versions attackcti` — verified attackcti 0.5.4 is latest
- STACK.md — confirmed Neo4j as entity relationship graph storage target
- INTEGRATIONS.md — confirmed Neo4j Bolt port 7687, attack chain DSPy signature

### Secondary (MEDIUM confidence — architectural patterns from training data)
- Neo4j Cypher patterns for security alert graphs
- Flink streaming correlation job structure
- Dynamic time window algorithm (frequency-based adaptation)
- pyattck API usage patterns

### Tertiary (LOW confidence — needs production validation)
- Specific ATT&CK technique coverage in pyattck for Suricata signatures
- Dynamic window threshold calibration (needs real data tuning)
- Flink job scaling characteristics for 30K+ daily alerts

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — versions verified from registries, libraries are official/standard
- Architecture: MEDIUM — patterns from training data, not cross-referenced with current docs
- Pitfalls: MEDIUM — common pitfalls well-documented in industry, project-specific tuning needed

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (30 days for stable stack components)
