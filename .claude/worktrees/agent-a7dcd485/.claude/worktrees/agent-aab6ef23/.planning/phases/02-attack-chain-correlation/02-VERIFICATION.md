---
phase: 02-attack-chain-correlation
verified: 2026-03-23T09:21:54Z
status: gaps_found
score: 0/4 must-haves verified
gaps:
  - truth: "Related alerts are correlated by shared indicators (source IP, target asset, attack pattern)"
    status: failed
    reason: "AlertCorrelator.add_alert() 依赖 dateutil.parser.parse 但 python-dateutil 未安装，导致时间戳解析失败"
    artifacts:
      - path: "src/chain/engine/correlator.py"
        issue: "使用 dateutil.parser.parse 但模块未安装"
      - path: "src/chain/attack_chain/service.py"
        issue: "同样依赖 dateutil.parser.parse"
    missing:
      - "python-dateutil 依赖未安装"
  - truth: "Attack chains are reconstructed as timeline visualizations showing progression"
    status: partial
    reason: "AttackChainService.build_chain_from_correlation() 和 test 无法运行（dateutil 缺失）"
    artifacts:
      - path: "src/chain/attack_chain/service.py"
        issue: "build_chain_from_correlation 方法存在但依赖缺失无法调用"
    missing:
      - "python-dateutil 依赖未安装"
  - truth: "Each chain is linked to relevant MITRE ATT&CK techniques when applicable"
    status: verified
    reason: "AttackChainMapper.map_to_attack() 工作正常，rules/attck_suricata.yaml 存在且包含 12 条规则"
    artifacts:
      - path: "src/chain/mitre/mapper.py"
        issue: ""
      - path: "rules/attck_suricata.yaml"
        issue: ""
    missing: []
  - truth: "Operator can view attack chain detail with all correlated alerts and chain metadata"
    status: partial
    reason: "API endpoints 存在但无法测试（FastAPI 未安装），reconstruct 和 status 更新为 TODO placeholder"
    artifacts:
      - path: "src/api/chain_endpoints.py"
        issue: "FastAPI 未安装导致无法导入测试；reconstruct 和 PATCH status 为 TODO"
    missing:
      - "FastAPI 依赖未安装"
      - "POST /api/chains/reconstruct 仅有 TODO placeholder"
      - "PATCH /api/chains/{id}/status 仅有 TODO placeholder"
---

# Phase 02: Attack Chain Correlation Verification Report

**Phase Goal:** 构建攻击链关联分析能力，支持多源异构告警的关联、ATT&CK 映射和攻击链构建

**Verified:** 2026-03-23
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Related alerts are correlated by shared indicators (source IP, target asset, attack pattern) | FAILED | AlertCorrelator 使用 dateutil 但模块未安装 |
| 2 | Attack chains are reconstructed as timeline visualizations showing progression | PARTIAL | build_chain_from_correlation 存在但依赖缺失 |
| 3 | Each chain is linked to relevant MITRE ATT&CK techniques when applicable | VERIFIED | AttackChainMapper 工作正常，12 条规则映射 |
| 4 | Operator can view attack chain detail with all correlated alerts and chain metadata | PARTIAL | API endpoints 存在但无法测试（FastAPI 未安装） |

**Score:** 0/4 truths fully verified, 2/4 partial

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/chain/mitre/mapper.py` | ATT&CK Mapper | VERIFIED | 169 行，AttackChainMapper 类，rule + LLM fallback |
| `src/chain/engine/correlator.py` | AlertCorrelator | FAILED | 192 行，但使用未安装的 dateutil |
| `src/chain/engine/dsl.py` | CorrelationRule DSL | VERIFIED | 172 行，支持 5 种操作符 |
| `src/chain/window/adaptive_window.py` | AdaptiveWindow | VERIFIED | 96 行，burst/sparse/normal 三模式 |
| `src/graph/client.py` | Neo4jClient | VERIFIED | 280 行，write/read/constraints 方法 |
| `src/chain/attack_chain/service.py` | AttackChainService | FAILED | 235 行，但使用未安装的 dateutil |
| `src/chain/attack_chain/models.py` | Pydantic Models | VERIFIED | 56 行，AlertModel/AttackChainModel |
| `src/api/chain_endpoints.py` | FastAPI Endpoints | PARTIAL | 105 行，4 个路由，但 FastAPI 未安装 |
| `rules/attck_suricata.yaml` | ATT&CK Rules | VERIFIED | 12 条规则，格式正确 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/chain/engine/correlator.py` | `src/chain/window/adaptive_window.py` | `AdaptiveWindow.compute_window()` | UNCERTAIN | 代码引用存在但 dateutil 阻塞 |
| `src/chain/engine/correlator.py` | `src/chain/mitre/mapper.py` | `AttackChainMapper.map_to_attack()` | UNCERTAIN | 代码引用存在但 dateutil 阻塞 |
| `src/chain/attack_chain/service.py` | `src/graph/client.py` | `Neo4jClient.write/read` | WIRED | 方法调用正确 |
| `src/api/chain_endpoints.py` | `src/chain/attack_chain/service.py` | `AttackChainService methods` | UNCERTAIN | FastAPI 未安装无法验证 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| ATT&CK mapper rule lookup | `python -c "from src.chain.mitre.mapper import AttackChainMapper; m = AttackChainMapper(); alert = {'alert_signature': 'ET SCAN Potential SSH Scan'}; result = m.map_to_attack(alert); print(f'{result.tactic} {result.technique_id}')"` | TA0043 T1046 | PASS |
| AdaptiveWindow burst mode | `python -c "from src.chain.window.adaptive_window import AdaptiveWindow; import time; w = AdaptiveWindow(); [w.record_alert(time.time()) for _ in range(15)]; print(w.compute_window())"` | 300 | PASS |
| AdaptiveWindow sparse mode | `python -c "from src.chain.window.adaptive_window import AdaptiveWindow; import time; w = AdaptiveWindow(); w.record_alert(time.time() - 3600); w.record_alert(time.time() - 7200); print(w.compute_window())"` | 86400 | PASS |
| DSL correlation rule | `python -c "from src.chain.engine.dsl import CorrelationRule; rule = CorrelationRule(name='test', conditions=[{'field': 'src_ip', 'operator': 'same_ip_pair', 'weight': 1.0}]); a1 = {'src_ip': '192.168.1.100'}; a2 = {'src_ip': '192.168.1.100'}; matched, conf = rule.matches(a1, a2); print(f'{matched}')"` | True | PASS |
| AlertCorrelator import | `python -c "from src.chain.engine.correlator import AlertCorrelator"` | OK | PASS |
| Neo4jClient methods | `python -c "from src.graph.client import Neo4jClient; c = Neo4jClient(); print(hasattr(c, 'write_alert'), hasattr(c, 'create_attack_chain'), hasattr(c, 'get_chain_by_id'), hasattr(c, 'list_chains'))"` | True True True True | PASS |
| AttackChainService methods | `python -c "from src.chain.attack_chain.service import AttackChainService; print(hasattr(AttackChainService, 'build_chain_from_correlation'), hasattr(AttackChainService, 'save_chain'))"` | True True | PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/api/chain_endpoints.py` | 80 | TODO comment | INFO | reconstruct endpoint 为 TODO placeholder |
| `src/api/chain_endpoints.py` | 100 | TODO comment | INFO | status update endpoint 为 TODO placeholder |
| `src/chain/engine/correlator.py` | 181 | dateutil.parser.parse | BLOCKER | 依赖未安装的模块 |
| `src/chain/attack_chain/service.py` | 56 | dateutil.parser.parse | BLOCKER | 依赖未安装的模块 |

### Human Verification Required

1. **API 端点功能测试**
   - Test: 启动 FastAPI 应用并测试 GET /api/chains 和 GET /api/chains/{id}
   - Expected: 返回攻击链列表和详情
   - Why human: FastAPI 未安装，无法自动化测试

2. **端到端流程测试**
   - Test: 填入告警数据，调用 AlertCorrelator.add_alert()，验证关联结果
   - Expected: 相关告警被正确关联
   - Why human: dateutil 缺失阻塞，需要安装依赖后测试

3. **Neo4j 集成测试**
   - Test: 启动 Neo4j 容器，验证 AttackChainService 能正确存储和读取数据
   - Expected: 攻击链数据正确持久化
   - Why human: 需要 Neo4j 运行环境

## Gaps Summary

### Critical Blocker: Missing `python-dateutil` Dependency

`src/chain/engine/correlator.py` 和 `src/chain/attack_chain/service.py` 都使用 `dateutil.parser.parse` 来解析 ISO 格式的时间戳字符串，但 `python-dateutil` 包未安装在当前环境中。

这导致：
- AlertCorrelator.add_alert() 无法处理 ISO 字符串时间戳
- AttackChainService.build_chain_from_correlation() 无法计算时间范围
- 相关的单元测试失败

**Fix:** 在 pyproject.toml 或 requirements.txt 中添加 `python-dateutil` 依赖，并执行安装。

### Partial: FastAPI Dependencies

`src/api/chain_endpoints.py` 定义了完整的 API 路由，但无法导入测试因为 FastAPI 未安装。

### Partial: API Placeholders

- POST /api/chains/reconstruct - TODO: 需要从 Phase 1 告警源读取数据
- PATCH /api/chains/{id}/status - TODO: 实现状态更新

---

_Verified: 2026-03-23T09:21:54Z_
_Verifier: Claude (gsd-verifier)_
