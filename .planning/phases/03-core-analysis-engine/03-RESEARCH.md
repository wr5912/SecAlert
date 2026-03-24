# Phase 3: Core Analysis Engine - Research

**Researched:** 2026-03-24
**Domain:** AI-driven false positive filtering and attack detection
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 implements an AI-driven false positive filter and attack detection engine. Building on Phase 2's attack chain correlation (Neo4j-stored chains), Phase 3 classifies chains as false positive or real threat using a rule-first + LLM fallback strategy, assigns severity levels, and supports operator review of suppressed chains.

The core technical challenge is designing a DSPy-based classifier that works with the existing attack chain data model, integrates with the established rule-first + LLM fallback pattern, and meets the <30% false positive rate target.

**Primary recommendation:** Implement `FalsePositiveClassifierSignature` and `ChainClassifierProgram` following the existing DSPy patterns in `parser/dspy/`, use Neo4j status field for soft-delete suppression, and build severity scoring on top of existing ATT&CK mapper.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 攻击链级别判断 — Classify entire attack chains, not individual alerts
- **D-02:** 规则优先 + LLM 兜底 — Same architecture as Phase 1/2
- **D-03:** 置信度使用 0.0-1.0 连续分数 — DSPy compatible
- **D-04:** 抑制阈值：置信度 < 0.5 自动判定为误报并抑制
- **D-05:** 软删除 + 可恢复 — Suppressed chains marked but not physically deleted
- **D-07:** 四档分级：Critical / High / Medium / Low — Industry standard, aligned with ATT&CK
- **D-08:** 严重度来源：ATT&CK 技术严重度基准 + 上下文系数调整

### Claude's Discretion (Areas for Research/Recommendation)
- ATT&CK 技术严重度基准表的具体数值
- 上下文系数调整算法（资产重要性、攻击阶段等如何量化）
- 误报恢复列表的 UI 展示方式
- 抑制日志的详细程度

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILTER-01 | 系统能自动过滤误报，直接忽略 | DSPy classifier with 0.5 threshold suppression, Neo4j soft-delete status |
| DETECT-01 | 系统能检测真实攻击并报警 | Severity scoring (Critical/High/Medium/Low), alert flagging |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dspy | >=2.0.0 | Signature-driven LLM programming | Stanford framework, used in Phase 1-2 for parsing |
| neo4j | >=5.0.0 | Graph database for attack chains | Already used in Phase 2 for chain storage |
| pydantic | >=2.5.0 | Data validation | Already used across codebase |
| PyYAML | >=6.0 | Rule configuration | Already used for ATT&CK rules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vllm | >=0.3.0 | LLM inference for Qwen3-32B | When LLM fallback is triggered |
| python-dateutil | >=2.8.0 | Timestamp parsing | Already in chain module |
| pytest | >=7.4.0 | Test framework | Already established in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DSPy classifier | Direct vLLM API calls | DSPy provides signature abstraction, compilation optimization, and consistent pattern |
| Neo4j for status | PostgreSQL for status tracking | Chains already in Neo4j, avoid adding new storage dependency |

**Installation:**
```bash
pip install dspy>=2.0.0 neo4j>=5.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── analysis/                      # Phase 3 新增
│   ├── __init__.py
│   ├── classifier/                # 误报分类器
│   │   ├── __init__.py
│   │   ├── signatures.py          # DSPy signatures
│   │   ├── programs.py            # DSPy programs
│   │   ├── rules.py               # 预置分类规则
│   │   └── severity.py            # 严重度评分
│   ├── service.py                 # 分析服务
│   └── api.py                     # 分析 API
tests/
├── test_analysis/                 # Phase 3 测试
│   ├── __init__.py
│   ├── test_classifier.py
│   ├── test_severity.py
│   └── conftest.py                # 分析层 fixtures
```

### Pattern 1: DSPy Binary Classifier Signature

Following the established `LogParserSignature` pattern in `parser/dspy/signatures/__init__.py`:

```python
# src/analysis/classifier/signatures.py
import dspy

class FalsePositiveClassifierSignature(dspy.Signature):
    """攻击链二分类：误报 vs 真实攻击"""

    # 输入字段
    chain_data = dspy.InputField(desc="攻击链完整数据，包含告警列表、时间范围、ATT&CK映射")
    rule_matched = dspy.InputField(desc="预置规则匹配结果，None表示无规则命中")
    threat_intel = dspy.InputField(desc="威胁情报命中情况")

    # 输出字段
    is_real_threat = dspy.OutputField(desc="是否为真实攻击: true/false")
    confidence = dspy.OutputField(desc="置信度 0.0-1.0")
    reasoning = dspy.OutputField(desc="分类推理过程")
    severity = dspy.OutputField(desc="严重度: critical/high/medium/low")
```

**Confidence scoring rationale:**
- Rule-matched high-confidence attacks (e.g., known malware C2): confidence >= 0.9
- LLM-inferred with strong evidence: confidence 0.6-0.85
- Ambiguous cases: confidence 0.4-0.6 (borderline)
- Low confidence indicators: confidence < 0.4

### Pattern 2: Chain Classifier Program

Following `LogParserProgram` pattern with Treact (or ChainOfThought for reasoning):

```python
# src/analysis/classifier/programs.py
class ChainClassifierProgram(dspy.Module):
    """攻击链分类程序 - 规则优先 + LLM 兜底"""

    def __init__(self, lm=None):
        super().__init__()
        self.classify = dspy.ChainOfThought(FalsePositiveClassifierSignature)
        self.lm = lm

    def forward(self, chain_data: dict, rule_result: dict = None,
                threat_intel: dict = None) -> dspy.Prediction:
        # Layer 1: 规则快速判断
        if rule_result and rule_result.get("confidence", 0) >= 0.95:
            return self._rule_decision(rule_result)

        # Layer 2: LLM 推理
        return self.classify(
            chain_data=chain_data,
            rule_matched=rule_result,
            threat_intel=threat_intel or {}
        )

    def _rule_decision(self, rule_result: dict) -> dspy.Prediction:
        """规则直接决策"""
        return dspy.Prediction(
            is_real_threat=rule_result["is_attack"],
            confidence=rule_result["confidence"],
            reasoning=f"Rule matched: {rule_result.get('rule_name')}",
            severity=rule_result.get("severity", "medium")
        )
```

### Pattern 3: Severity Scoring with ATT&CK Base

Severity derivation from ATT&CK technique ID with context adjustment:

```python
# src/analysis/classifier/severity.py

# ATT&CK 技术严重度基准表 (简化版，需扩展完整列表)
ATTACK_TECHNIQUE_SEVERITY = {
    # Critical: 数据泄露、持久化控制
    "T1041": "critical",  # Exfiltration Over C2 Channel
    "T1050": "critical",  # New Service (Persistence)
    "T1052": "critical",  # Exfiltration Over Physical Medium

    # High: 横向移动、权限提升
    "T1021": "high",      # Remote Services (Lateral Movement)
    "T1068": "high",      # Exploitation for Privilege Escalation
    "T1053": "high",      # Scheduled Task/Job (Persistence)

    # Medium: 侦察、初始访问尝试
    "T1046": "medium",    # Network Service Discovery
    "T1190": "medium",    # Exploit Public-Facing Application
    "T1133": "medium",    # External Remote Services

    # Low: 信息收集、扫描
    "T1595": "low",       # Active Scanning
}

# 上下文严重度调整系数
SEVERITY_CONTEXT_MULTIPLIERS = {
    "asset_critical": 1.5,      # 关键资产
    "internal_source": 1.3,    # 内部源IP扫描
    "repeated_attack": 1.4,    # 重复攻击
    "unusually_port": 1.2,     # 非寻常端口
}

def calculate_severity(technique_id: str, context: dict) -> str:
    """计算严重度：ATT&CK基准 + 上下文调整"""
    base = ATTACK_TECHNIQUE_SEVERITY.get(technique_id, "medium")
    severity_order = ["low", "medium", "high", "critical"]
    base_idx = severity_order.index(base)

    # 应用上下文系数
    multiplier = 1.0
    for factor, mult in SEVERITY_CONTEXT_MULTIPLIERS.items():
        if context.get(factor):
            multiplier *= mult

    adjusted_idx = min(int(base_idx * multiplier), 3)
    return severity_order[adjusted_idx]
```

### Anti-Patterns to Avoid
- **不要在分类器中硬编码判断逻辑** — 使用 DSPy signature 让 LLM 理解任务，而不是代码中的 if-else
- **不要对单条告警单独分类** — Phase 2 的攻击链是整体，应作为分类单位
- **不要物理删除误报** — D-05 要求软删除，保留恢复能力

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM 调用抽象 | 直接调用 vLLM API | DSPy Treact/ChainOfThought | DSPy 提供签名抽象、编译优化、trace 支持 |
| ATT&CK 映射 | 每次从头查询 MITRE | 复用 `AttackChainMapper` | Phase 2 已实现规则优先 + LLM 兜底 |
| 严重度量化 | 拍脑袋定权重 | ATT&CK 技术严重度基准 | MITRE 提供行业认可的分级 |
| 分类结果存储 | 新建独立存储 | Neo4j AttackChain status | 链已存在，避免数据碎片 |

**Key insight:** Phase 2 的 `AttackChainMapper` 和 `AttackChainService` 提供了完整的 ATT&CK 映射和链存储能力，Phase 3 应在其基础上扩展分类能力，而不是重建。

## Common Pitfalls

### Pitfall 1: 分类粒度错误（单告警 vs 攻击链）
**What goes wrong:** 对链内每条告警单独判断，导致同一链内告警判断不一致
**Why it happens:** 早期系统设计时没有攻击链概念，只能逐条判断
**How to avoid:** Phase 3 明确以攻击链为分类粒度，所有输入输出都基于 `chain_id`
**Warning signs:** 代码中出现 `for alert in alerts: classify(alert)` 模式

### Pitfall 2: 0.5 阈值一刀切
**What goes wrong:** 0.5 阈值对某些高严重度攻击链也会错误抑制
**Why it happens:** 置信度是连续的，但阈值是离散的
**How to avoid:** 结合严重度：Critical/High 严重度的链，即使 confidence < 0.5 也标记为"待审核"而非自动抑制
**Warning signs:** 重大攻击被静默抑制，无人工审核入口

### Pitfall 3: LLM 幻觉导致错误分类
**What goes wrong:** LLM 将真实攻击误判为误报
**Why it happens:** 缺乏上下文时 LLM 倾向于保守判断
**How to avoid:** 规则优先 (confidence >= 0.95 直接放行)，LLM 只处理规则未覆盖的情况
**Warning signs:** 真实攻击被大量抑制，误报率统计显示 false negative 上升

### Pitfall 4: 忽略 Phase 2 → Phase 3 数据衔接
**What goes wrong:** 分类器设计与 Neo4j 存储结构不匹配
**Why it happens:** Phase 2 和 Phase 3 由不同人实现，缺乏对接
**How to avoid:** 复用 `AttackChainModel` 和 `Neo4jClient.update_chain_status()` 方法
**Warning signs:** 新增字段与 Neo4j schema 不一致

## Code Examples

### Example 1: 从 Neo4j 读取攻击链进行分类

```python
# src/analysis/service.py
from src.graph.client import Neo4jClient
from src.chain.attack_chain.models import AttackChainModel
from .classifier.programs import ChainClassifierProgram

class AnalysisService:
    def __init__(self, neo4j_client: Neo4jClient = None):
        self.neo4j = neo4j_client or Neo4jClient()
        self.classifier = ChainClassifierProgram()

    def classify_chain(self, chain_id: str) -> dict:
        """对单条攻击链进行分类"""
        # 1. 从 Neo4j 读取链数据
        chain = self.neo4j.get_chain_by_id(chain_id)
        if not chain:
            return {"error": "Chain not found"}

        # 2. 构建分类输入
        chain_data = self._build_chain_context(chain)

        # 3. 规则优先判断
        rule_result = self._check_classification_rules(chain)

        # 4. DSPy 分类
        result = self.classifier.forward(
            chain_data=chain_data,
            rule_result=rule_result
        )

        # 5. 应用阈值
        if result.confidence < 0.5:
            self._suppress_chain(chain_id, result)
        else:
            self._flag_real_attack(chain_id, result)

        return {
            "chain_id": chain_id,
            "is_real_threat": result.is_real_threat,
            "confidence": result.confidence,
            "severity": result.severity,
            "reasoning": result.reasoning
        }
```

### Example 2: 分类结果写入 Neo4j (软删除)

```python
# src/analysis/service.py (continued)

def _suppress_chain(self, chain_id: str, result: dspy.Prediction):
    """抑制误报攻击链（软删除）"""
    self.neo4j.update_chain_status(chain_id, "false_positive")
    # 可选：记录抑制日志
    logger.info(
        f"Chain {chain_id} suppressed as false positive. "
        f"Confidence={result.confidence:.2f}, Reason={result.reasoning}"
    )

def _flag_real_attack(self, chain_id: str, result: dspy.Prediction):
    """标记真实攻击"""
    self.neo4j.update_chain_status(chain_id, "active")
    # 可选：更新严重度标签
    self.neo4j.set_chain_severity(chain_id, result.severity)
    logger.warning(
        f"Chain {chain_id} flagged as real attack. "
        f"Severity={result.severity}, Confidence={result.confidence:.2f}"
    )
```

### Example 3: 误报率统计

```python
# src/analysis/metrics.py

class FalsePositiveMetrics:
    """误报率指标计算"""

    def __init__(self, neo4j_client):
        self.neo4j = neo4j_client

    def calculate_fp_rate(self, time_window_hours: int = 24) -> dict:
        """计算误报率"""
        # 查询指定时间范围内的链
        chains = self.neo4j.list_chains_all(status="false_positive")

        total = self.neo4j.count_chains()
        fp_count = len(chains)

        if total == 0:
            return {"fp_rate": 0.0, "total": 0, "false_positives": 0}

        fp_rate = fp_count / total

        return {
            "fp_rate": round(fp_rate, 3),
            "false_positive_rate_percent": round(fp_rate * 100, 1),
            "total_chains": total,
            "false_positives": fp_count,
            "true_positives": total - fp_count,
            "target_met": fp_rate < 0.30
        }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单告警判断 | 攻击链级别判断 | Phase 2→3 | 减少误报，关联上下文更准确 |
| 规则引擎独立 | 规则优先 + LLM 兜底 | Phase 1→2→3 | 规则高速处理，LLM 处理复杂场景 |
| 物理删除误报 | 软删除 + 可恢复 | Phase 3 (new) | 保留审计能力，支持误报恢复 |

**Deprecated/outdated:**
- 逐条告警分析：已被攻击链关联分析取代
- 硬编码阈值：无上下文适配能力

## Open Questions

1. **ATT&CK 严重度基准表完整性**
   - What we know: Phase 2 mapper.py 有 tactic 映射，但无 technique severity
   - What's unclear: Phase 3 需要完整的 technique→severity 映射表
   - Recommendation: 复用 MITRE ATT&CK Navigator 层的概念，建立简化版 severity lookup

2. **上下文系数调整算法**
   - What we know: D-08 要求"上下文系数调整"，但具体算法未定义
   - What's unclear: 资产重要性、攻击阶段等如何量化
   - Recommendation: 使用简单加权模型：`severity = base_severity * asset_weight * stage_weight`

3. **误报恢复列表的 UI 展示**
   - What we know: Phase 4 是 UI phase
   - What's unclear: Phase 3 应提供什么数据接口
   - Recommendation: `/api/chains?status=false_positive` 分页列表 + 单条恢复 API

4. **抑制日志的详细程度**
   - What we know: 需要记录抑制供审计
   - What's unclear: 完整原始告警 vs 聚合摘要
   - Recommendation: 存储 chain_id 引用 + suppression reason，不重复存储告警数据

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies beyond existing project infrastructure)

Phase 3 uses only existing project infrastructure:
- Neo4j (already in stack)
- DSPy (already in ai optional-deps)
- Python 3.10+ (project requirement)

No new external tools, services, or CLI utilities required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest >= 7.4.0 |
| Config file | pyproject.toml [tool.pytest.ini_options] |
| Quick run command | `pytest tests/test_analysis/ -x -v` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILTER-01 | 自动过滤误报 | Unit | `pytest tests/test_analysis/test_classifier.py::test_suppression_threshold -x` | No (Wave 0) |
| FILTER-01 | 误报软删除可恢复 | Unit | `pytest tests/test_analysis/test_classifier.py::test_false_positive_restore -x` | No (Wave 0) |
| DETECT-01 | 真实攻击严重度标注 | Unit | `pytest tests/test_analysis/test_severity.py::test_severity_scoring -x` | No (Wave 0) |
| - | 误报率计算 | Unit | `pytest tests/test_analysis/test_metrics.py::test_fp_rate_calculation -x` | No (Wave 0) |

### Sampling Rate
- **Per task commit:** `pytest tests/test_analysis/ -x -q`
- **Per wave merge:** `pytest tests/ -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_analysis/__init__.py` — test package init
- [ ] `tests/test_analysis/conftest.py` — fixtures for mock chains, classification results
- [ ] `tests/test_analysis/test_classifier.py` — classifier unit tests
- [ ] `tests/test_analysis/test_severity.py` — severity scoring tests
- [ ] `tests/test_analysis/test_metrics.py` — false positive rate metrics tests
- [ ] `src/analysis/classifier/signatures.py` — FalsePositiveClassifierSignature
- [ ] `src/analysis/classifier/programs.py` — ChainClassifierProgram
- [ ] `src/analysis/classifier/rules.py` — pre-built classification rules
- [ ] `src/analysis/classifier/severity.py` — severity scoring logic
- [ ] `src/analysis/service.py` — AnalysisService
- [ ] `src/analysis/metrics.py` — FalsePositiveMetrics

## Sources

### Primary (HIGH confidence)
- `/home/admin/work/SecAlert/src/chain/attack_chain/models.py` — AttackChainModel with status field
- `/home/admin/work/SecAlert/src/graph/client.py` — Neo4jClient.update_chain_status() method
- `/home/admin/work/SecAlert/src/chain/mitre/mapper.py` — AttackChainMapper pattern
- `/home/admin/work/SecAlert/parser/dspy/signatures/__init__.py` — existing DSPy signature pattern

### Secondary (MEDIUM confidence)
- `/home/admin/work/SecAlert/docs/落地方案.md` — AlertAnalyzerSignature, RiskScoringSignature patterns
- `/home/admin/work/SecAlert/pyproject.toml` — dspy>=2.0.0 dependency
- `/home/admin/work/SecAlert/rules/attck_suricata.yaml` — existing ATT&CK rules

### Tertiary (LOW confidence)
- Web search for MITRE ATT&CK severity data — blocked by network restrictions, recommend offline JSON import

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — DSPy and Neo4j patterns well established, no new dependencies
- Architecture: HIGH — Follows existing Phase 1/2 patterns, Neo4j schema already supports status field
- Pitfalls: MEDIUM — Identified 4 common pitfalls with mitigation strategies

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days for stable phase)
