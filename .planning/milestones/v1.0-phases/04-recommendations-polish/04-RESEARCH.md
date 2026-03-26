# Phase 4: Recommendations & Polish - Research

**Researched:** 2026-03-24
**Domain:** 处置建议生成 + React 运营界面
**Confidence:** HIGH

## Summary

Phase 4 在 Phase 3 输出的已分类攻击链基础上，生成通俗易懂的处置建议并呈现给非专业运维人员。核心技术决策延续 Phase 1-3 的"规则优先 + LLM 兜底"策略：预置 ATT&CK Technique 处置建议模板库（YAML 格式），未知攻击类型由 Qwen3-32B 生成建议。

**Phase 4 定位：** 告警分析平台/引擎，专注安全分析和处置建议生成，不具备响应处置能力。提供 API 接口给威胁响应平台支撑。

**输入：** Neo4j 中的已分类攻击链（含严重度标签）
**输出：** 处置建议 + 运营 UI + 响应平台 API
**Primary recommendation:** 复用现有 `src/analysis/classifier/` 的 DSPy 签名模式，新建 `RemediationAdvisorSignature`，扩展 YAML 规则文件添加处置建议模板。

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 规则模板优先 + LLM 兜底 — 预置 ATT&CK 处置建议模板库（按 Technique ID 索引），未知攻击类型由 Qwen3-32B 生成
- **D-02:** 混合内容风格 — 核心行动一行 + 可展开详细说明
- **D-03:** 建议必须引用具体资产信息（IP、主机名、端口）
- **D-04:** ATT&CK 战术/技术编号可选显示（默认不显示，点击"技术详情"可展开）
- **D-05:** 简化线性时间线 — 关键节点：攻击源 IP → 主要攻击行为 → 受影响资产 → 攻击阶段
- **D-06:** 默认只显示 Critical + High 严重度告警
- **D-07:** 单屏设计 — 攻击链摘要 + 处置建议 + 操作按钮
- **D-08:** 响应工作流 — "确认已通报"和"确认为误报"+可选备注（仅记录，不执行）
- **D-09:** Phase 4 UI 集成误报恢复功能
- **D-10:** React 前端
- **D-11:** API 接口供威胁响应平台调用

### Claude's Discretion
- ATT&CK 处置建议模板库的具体内容（按 Technique 积累）
- React 组件结构设计（列表组件、详情单屏组件、时间线组件）
- 简化时间线的数据转换逻辑（从 Phase 2 完整数据提取关键节点）
- 建议可展开详情的交互方式（折叠面板、Tooltip、还是 Modal）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REMED-01 | 系统能给出简单明确的处置建议 | ATT&CK 模板库设计（D-01）、LLM Prompt 设计、DSPy Signature 模式 |
| UI-01 | 界面简洁，面向非专业运维人员 | React 组件架构、单屏设计（D-07）、默认 Critical/High 过滤（D-06） |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | 前端 UI 框架 | D-10 决策：组件化开发，与 FastAPI JSON API 对接 |
| FastAPI | 0.100+ | JSON API 服务 | 现有 `src/api/chain_endpoints.py` 已使用，Python 3.10+ |
| Neo4j | 5.0+ | 攻击链图存储 | 现有 `src/graph/client.py` 已集成，Phase 3 输出存储 |
| DSPy | 2.0+ | LLM 签名编程 | 现有 `src/analysis/classifier/programs.py` 已用，延续模式 |
| Pydantic | 2.5+ | 数据模型验证 | 现有 `src/chain/attack_chain/models.py` 已用 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PyYAML | 6.0+ | 处置建议模板解析 | 读取 `rules/remediation_templates.yaml` |
| pytest | 7.4+ | 单元测试 | API endpoint 测试、处置建议生成测试 |
| react-query / SWR | latest | 数据获取 | 可选 - 替代 fetch 简化状态管理 |
| tailwindcss | 3.x | CSS 框架 | 可选 - 快速 UI 开发 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind CSS | Styled Components / CSS Modules | Tailwind 快速原型，但增加构建复杂度 |
| React Context | Redux / Zustand | Context 足够简单，Phase 4 状态不复杂 |
| react-query | SWR | 两者类似，团队熟悉度决定 |

**Installation:**
```bash
# Python 端（复用现有）
pip install dspy>=2.0.0 pyyaml>=6.0

# React 端
npm install react react-dom
# 或使用 Vite 快速创建
npm create vite@latest frontend -- --template react
```

**Version verification:**
```bash
npm view react version    # 确认 18+
npm view dspy version     # 确认 2.0+
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── analysis/
│   ├── classifier/
│   │   ├── signatures.py        # FalsePositiveClassifierSignature (现有)
│   │   └── programs.py          # ChainClassifierProgram (现有)
│   ├── remediation/             # NEW - 处置建议生成模块
│   │   ├── __init__.py
│   │   ├── advisor.py           # RemediationAdvisor 类（模板 + LLM）
│   │   ├── signatures.py        # NEW - RemediationRecommendationSignature
│   │   ├── templates.py          # 模板加载和匹配逻辑
│   │   └── programs.py          # DSPy 程序（如果用 DSPy）
├── api/
│   ├── chain_endpoints.py       # /api/chains (现有)
│   └── remediation_endpoints.py # NEW - /api/remediation 路由

rules/
├── attck_suricata.yaml          # ATT&CK 映射 (现有)
└── remediation_templates.yaml    # NEW - 处置建议模板库

frontend/                        # NEW - React 前端
├── src/
│   ├── components/
│   │   ├── AlertList.tsx        # 告警列表组件
│   │   ├── AlertDetail.tsx      # 单屏详情组件
│   │   ├── ChainTimeline.tsx    # 简化攻击链时间线
│   │   ├── RemediationPanel.tsx # 处置建议面板
│   │   └── ui/                  # 基础 UI 组件
│   ├── hooks/
│   │   └── useAlerts.ts         # 告警数据获取 hook
│   ├── api/
│   │   └── client.ts            # FastAPI API 客户端
│   ├── types/
│   │   └── index.ts             # TypeScript 类型定义
│   └── App.tsx
├── package.json
└── vite.config.ts
```

### Pattern 1: 规则优先 + LLM 兜底（延续 Phase 1-3）

**What:** 处置建议生成采用与分类器相同的策略：先查预置模板，未命中再用 LLM 生成。

**When to use:** 每次生成告警处置建议时。

**Example:**
```python
# src/analysis/remediation/advisor.py
class RemediationAdvisor:
    """处置建议生成器 - 规则优先 + LLM 兜底"""

    def __init__(self, template_file: str = "rules/remediation_templates.yaml"):
        self.templates: Dict[str, Dict] = self._load_templates(template_file)
        self._llm_program = None  # 延迟加载

    def get_recommendation(self, chain_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取处置建议"""
        # 1. 从 chain_data 提取 technique_id
        technique_ids = self._extract_techniques(chain_data)

        # 2. 模板查找
        for tech_id in technique_ids:
            if template := self.templates.get(tech_id):
                return self._apply_template(template, chain_data)

        # 3. LLM 生成
        return self._llm_generate(chain_data, technique_ids)

    def _apply_template(self, template: Dict, chain_data: Dict) -> Dict[str, Any]:
        """应用模板并填充具体资产信息"""
        return {
            "short_action": template["short_action"].format(
                src_ip=chain_data.get("src_ip", "未知"),
                dst_ip=chain_data.get("asset_ip", "未知"),
                port=chain_data.get("port", "未知")
            ),
            "detailed_steps": template.get("detailed_steps", []),
            "attck_ref": template.get("attck_ref"),
            "source": "template"
        }
```

**Source:** 复用 `src/analysis/classifier/programs.py` 的 ChainClassifierProgram 模式

### Pattern 2: 简化时间线提取

**What:** 从 Phase 2 完整攻击链数据中提取关键节点，生成非专业运维人员可理解的线性时间线。

**When to use:** 在 AlertDetail 单屏组件中展示攻击链摘要时。

**Example:**
```python
# src/analysis/remediation/timeline.py
def simplify_chain_timeline(chain_data: Dict[str, Any]) -> Dict[str, Any]:
    """从完整攻击链提取简化时间线

    简化规则 (D-05):
    - 攻击源 IP: 第一条告警的 src_ip
    - 主要攻击行为: 严重度最高的告警类型
    - 受影响资产: chain_data.asset_ip
    - 攻击阶段: mitre_tactic 映射到友好名称
    """
    alerts = chain_data.get("alerts", [])
    if not alerts:
        return {"nodes": [], "summary": "无告警数据"}

    # 提取关键节点
    src_ip = alerts[0].get("src_ip", "未知")
    asset_ip = chain_data.get("asset_ip", "未知")

    # 严重度最高的告警作为主要行为
    primary_alert = max(alerts, key=lambda a: a.get("severity", 0))
    primary_behavior = primary_alert.get("alert_signature", "未知行为")

    # ATT&CK 阶段映射
    tactic = primary_alert.get("mitre_tactic", "")
    tactic_names = {
        "TA0043": "侦察阶段",
        "TA0001": "初始访问",
        "TA0002": "执行阶段",
        "TA0003": "持久化",
        "TA0004": "权限提升",
        "TA0006": "凭证访问",
        "TA0008": "横向移动",
        "TA0010": "数据泄露",
        "TA0011": "命令控制"
    }
    attack_phase = tactic_names.get(tactic, "攻击中")

    return {
        "nodes": [
            {"type": "source", "label": f"攻击源: {src_ip}", "icon": "🔍"},
            {"type": "behavior", "label": primary_behavior, "icon": "⚠️"},
            {"type": "target", "label": f"受影响: {asset_ip}", "icon": "🎯"},
            {"type": "phase", "label": attack_phase, "icon": "📍"}
        ],
        "summary": f"检测到来自 {src_ip} 对 {asset_ip} 的 {attack_phase}，主要行为: {primary_behavior}"
    }
```

### Pattern 3: DSPy Signature 驱动的 LLM 生成

**What:** 使用 DSPy Signature 定义处置建议生成的输入输出规范。

**When to use:** 当模板未命中，需要 LLM 生成时。

**Example:**
```python
# src/analysis/remediation/signatures.py
if DSPY_AVAILABLE:
    class RemediationRecommendationSignature(dspy.Signature):
        """处置建议生成签名

        输入：攻击链数据 + ATT&CK 技术信息 + 资产上下文
        输出：一行核心行动 + 详细步骤 + ATT&CK 引用
        """
        chain_data = dspy.InputField(
            desc="攻击链完整数据，包含告警列表、源IP、目标IP、端口等"
        )
        technique_id = dspy.InputField(
            desc="ATT&CK technique ID，如 T1190"
        )
        asset_context = dspy.InputField(
            desc="资产上下文，包含 IP、主机名、端口等服务信息"
        )

        short_action = dspy.OutputField(
            desc="一行核心行动建议，必须包含具体资产信息，如：阻断 192.168.1.100 的 445 端口访问"
        )
        detailed_steps = dspy.OutputField(
            desc="详细处置步骤列表，每步一行"
        )
        attck_ref = dspy.OutputField(
            desc="ATT&CK 技术引用，格式：T1190 - Exploit Public-Facing Application"
        )
```

**Source:** 复用 `src/analysis/classifier/signatures.py` 的 FalsePositiveClassifierSignature 模式

### Anti-Patterns to Avoid

- **不要在建议中使用通用描述：** "阻断可疑 IP" → 必须具体化为 "阻断 192.168.1.100 的 445 端口"（D-03）
- **不要显示完整时间线：** Phase 4 只做简化提炼，Phase 2 完整数据保留在 Neo4j
- **不要让用户执行响应操作：** 平台只记录状态，不执行实际阻断（D-08）
- **不要默认显示全部告警：** 必须默认 Critical + High（D-06）

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 处置建议生成 | 从头训练 LLM 或手写规则 | DSPy Signature + 模板库 | Qwen3-32B 已有强大推理能力，只需 Prompt 设计 |
| ATT&CK 映射 | 自行维护完整 ATT&CK 数据库 | 复用 `src/chain/mitre/mapper.py` | MITRE 官方数据庞大，自建不现实 |
| 前端状态管理 | Redux / MobX | React Context 或 local state | Phase 4 状态简单，不需要复杂状态管理 |
| API 客户端 | 手写 fetch | SWR / react-query | 自动缓存、轮询、错误处理 |

**Key insight:** Phase 4 是"最后一公里"——用成熟工具快速落地，而非重新发明轮子。

---

## Runtime State Inventory

> Phase 4 是新增功能（UI + 处置建议生成），不涉及 rename/refactor/migration。Runtime State Inventory 仅当 Phase 4 涉及现有数据重命名时需要。检查结论：**Phase 4 不涉及现有数据 rename，SKIP 此章节。**

---

## Common Pitfalls

### Pitfall 1: 处置建议引用错误资产
**What goes wrong:** 建议中显示的 IP/端口与实际告警不匹配，误导运维人员。
**Why it happens:** 从 chain_data 提取资产信息时未校验完整性。
**How to avoid:** 模板填充前校验 chain_data 包含必要字段（src_ip, dst_ip, port），缺失时标记为"未知"而非空值。
**Warning signs:** unit test 中 chain_data 使用空列表时建议内容为空。

### Pitfall 2: LLM 生成建议过长
**What goes wrong:** Qwen3-32B 生成的长篇建议让非专业运维人员无法理解。
**Why it happens:** 没有在 Prompt 中约束输出长度和格式。
**How to avoid:** Few-shot 示例明确展示"一行核心行动 + 3-5 条详细步骤"的格式。
**Warning signs:** 使用 `len(recommendation["detailed_steps"]) > 10` 作为自动截断触发条件。

### Pitfall 3: Critical/High 过滤遗漏
**What goes wrong:** API 返回全部告警，前端即使默认过滤也无法确保后端数据隔离。
**Why it happens:** 前端过滤是 UI 层面的"假安全"，响应平台 API 调用可能获取全部数据。
**How to avoid:** API 端点默认支持 `?severity=critical,high` 参数，D-06 是 UI 承诺，不是安全边界。
**Warning signs:** `/api/chains` 返回的 chains 中存在 medium/low 严重度。

### Pitfall 4: 误报恢复状态不一致
**What goes wrong:** 用户点击"确认为误报"，UI 显示恢复成功，但 Neo4j 状态未更新。
**Why it happens:** `restore_chain` API 调用后未刷新本地状态，或 API 调用失败未提示。
**How to avoid:** 调用后主动刷新数据，确保 UI 与后端状态一致；API 失败时显示明确错误提示。
**Warning signs:** 刷新后误报链重新出现在"已抑制告警"列表中。

---

## Code Examples

### 处置建议模板 YAML 结构
```yaml
# rules/remediation_templates.yaml
templates:
  # T1190: Web 应用攻击
  "T1190":
    short_action: "检查 {dst_ip} 的 Web 应用日志，确认是否存在未授权访问"
    detailed_steps:
      - "1. 查看 {dst_ip} 的 Nginx/Apache 访问日志"
      - "2. 搜索来自 {src_ip} 的 404/500 错误"
      - "3. 检查是否存在 SQL 注入特征"
      - "4. 如确认攻击，封锁 {src_ip}"
    attck_ref: "T1190 - Exploit Public-Facing Application"
    severity: "medium"

  # T1021: 远程服务横向移动
  "T1021":
    short_action: "封锁 {src_ip} 与 {dst_ip} 的 {port} 端口通信"
    detailed_steps:
      - "1. 检查 {dst_ip} 的 {port} 端口访问日志"
      - "2. 确认是否存在异常 SSH/RDP 登录"
      - "3. 如确认横向移动，立即隔离 {dst_ip}"
      - "4. 重置受影响账户密码"
    attck_ref: "T1021 - Remote Services"
    severity: "high"

  # T1041: 数据泄露
  "T1041":
    short_action: "检查 {dst_ip} 的外发流量，封锁 {src_ip} 的异常连接"
    detailed_steps:
      - "1. 查看防火墙外发流量日志"
      - "2. 确认是否存在大量数据外发"
      - "3. 封锁 {src_ip} 的所有连接"
      - "4. 通知安全团队进行取证"
    attck_ref: "T1041 - Exfiltration Over C2 Channel"
    severity: "critical"
```

### API Endpoint: 获取处置建议
```python
# src/api/remediation_endpoints.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/api/remediation", tags=["remediation"])

@router.get("/chains/{chain_id}")
async def get_remediation(chain_id: str) -> dict:
    """获取攻击链的处置建议

    - **chain_id**: 攻击链 ID
    """
    # 1. 从 Neo4j 获取链数据
    chain_data = neo4j_client.get_chain_by_id(chain_id)
    if not chain_data:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not found")

    # 2. 生成处置建议
    advisor = RemediationAdvisor()
    recommendation = advisor.get_recommendation(chain_data)

    # 3. 简化时间线
    timeline = simplify_chain_timeline(chain_data)

    return {
        "chain_id": chain_id,
        "severity": chain_data.get("max_severity"),
        "status": chain_data.get("status"),
        "recommendation": recommendation,
        "timeline": timeline,
        "asset_ip": chain_data.get("asset_ip"),
        "src_ip": chain_data.get("alerts", [{}])[0].get("src_ip") if chain_data.get("alerts") else None
    }
```

### API Endpoint: 误报恢复
```python
@router.post("/chains/{chain_id}/restore")
async def restore_false_positive(chain_id: str) -> dict:
    """恢复被误判的误报链

    - **chain_id**: 攻击链 ID
    """
    analysis_service = AnalysisService()
    result = analysis_service.restore_chain(chain_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result
```

### API Endpoint: 告警列表（默认 Critical/High）
```python
@router.get("/chains")
async def list_chains(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    severity: Optional[str] = Query(default="critical,high", pattern="^(all|critical|high|medium|low|critical,high)$")
) -> AttackChainListResponse:
    """列出攻击链

    - **severity**: 默认 critical,high（per D-06）
    """
    # 解析 severity 参数
    status_filter = None if severity == "all" else None

    service = get_service()
    chains = service.neo4j.list_chains(limit=limit, offset=offset, status=status_filter)

    # 后处理过滤（如果需要）
    if severity != "all":
        severity_levels = severity.split(",")
        chains = [c for c in chains if c.get("max_severity") in severity_levels]

    return AttackChainListResponse(chains=chains, total=len(chains), limit=limit, offset=offset)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|--------------|--------|
| 人工撰写处置建议文档 | ATT&CK 模板库 + LLM 生成 | Phase 4 | 自动化、个性化建议 |
| 完整攻击链时间线展示 | 简化线性时间线 | Phase 4 (D-05) | 非专业人员可理解 |
| 全部告警列表 | Critical/High 默认过滤 | Phase 4 (D-06) | 降低信息过载 |

**Deprecated/outdated:**
- Phase 2/3 的"完整数据展示"模式：Phase 4 只做简化提炼，不展示完整时间线

---

## Open Questions

1. **处置建议模板覆盖度**
   - What we know: YAML 模板按 technique_id 索引，需人工积累
   - What's unclear: 初期模板数量（10 个常见 technique vs 50+ 完整覆盖）
   - Recommendation: 初期覆盖 20 个最高频 technique（T1190, T1021, T1046, T1071, T1053 等），LLM 兜底处理其他

2. **React 组件库选择**
   - What we know: D-10 要求 React，但未指定组件库
   - What's unclear: 使用 Headless UI + Tailwind 还是 Material UI / Ant Design
   - Recommendation: Headless UI + Tailwind CSS（轻量、可定制、符合极简风格）

3. **LLM 生成质量评估**
   - What we know: Qwen3-32B 用于生成，但未定义质量标准
   - What's unclear: 如何衡量建议"有用"还是"无用"
   - Recommendation: 人工抽检 + 正则校验（建议长度、是否包含资产信息）

---

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies identified beyond existing project dependencies)

Phase 4 主要依赖现有项目已安装的工具：
- Python 3.10+: 项目要求
- Neo4j: Phase 3 已集成
- DSPy: pyproject.toml 已声明
- React: 前端新建，不影响后端环境

**Missing dependencies with no fallback:**
- 无阻塞项

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 7.4+ |
| Config file | pyproject.toml `[tool.pytest.ini_options]` |
| Quick run command | `pytest tests/test_remediation/ -x -v` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REMED-01 | 系统能给出简单明确的处置建议 | unit | `pytest tests/test_remediation/ -k test_recommendation_generation -x` | 否 - 需 Wave 0 |
| REMED-01 | 建议引用具体资产信息 | unit | `pytest tests/test_remediation/ -k test_asset_reference -x` | 否 - 需 Wave 0 |
| UI-01 | Critical/High 默认过滤 | integration | `pytest tests/test_api/ -k test_chain_list_severity_filter -x` | 否 - 需 Wave 0 |
| UI-01 | 误报恢复功能 | integration | `pytest tests/test_api/ -k test_restore_chain -x` | 否 - 需 Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_remediation/ -x -q`
- **Per wave merge:** `pytest tests/ -x -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_remediation/__init__.py` - 模块初始化
- [ ] `tests/test_remediation/test_advisor.py` - RemediationAdvisor 单元测试
- [ ] `tests/test_remediation/test_templates.py` - 模板加载和匹配测试
- [ ] `tests/test_api/__init__.py` - API 测试模块
- [ ] `tests/test_api/test_remediation_endpoints.py` - 处置建议 API 测试
- [ ] `tests/conftest.py` - 扩展 mock fixtures（mock_chain_data, mock_recommendation）

---

## Sources

### Primary (HIGH confidence)
- `src/analysis/classifier/programs.py` - DSPy 程序模式
- `src/analysis/classifier/signatures.py` - DSPy Signature 模式
- `src/analysis/classifier/severity.py` - ATT&CK 技术严重度基准
- `src/graph/client.py` - Neo4j 攻击链读写
- `src/api/chain_endpoints.py` - FastAPI 端点模式
- `src/chain/mitre/mapper.py` - ATT&CK 映射
- `rules/attck_suricata.yaml` - ATT&CK 映射模板格式

### Secondary (MEDIUM confidence)
- MITRE ATT&CK 官方文档 - 处置建议参考（未直接引用，但知识来源于此）
- React 18 官方文档 - 组件架构建议

### Tertiary (LOW confidence)
- 业界 UI 设计最佳实践 - 单屏设计建议（需实际用户验证）

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 基于现有项目技术栈和 D-10 决策
- Architecture: HIGH - 复用现有 DSPy/DSPy Signature 模式
- Pitfalls: MEDIUM - 基于常见 Web 安全系统问题推断

**Research date:** 2026-03-24
**Valid until:** 2026-04-24（30 天，技术栈稳定）
