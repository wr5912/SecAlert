"""
分析模块 API 端点 - Phase 11 后端联调

为前端智能分析工作台提供数据支持：
- 故事线列表
- 攻击链路图
- 时间线事件
- 资产上下文
- 威胁狩猎查询
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis_endpoints"])


def _get_neo4j_client():
    """获取 Neo4j 客户端"""
    from src.graph.client import Neo4jClient
    return Neo4jClient()


def _build_storyline_from_chain(chain: Dict[str, Any]) -> Dict[str, Any]:
    """将攻击链数据转换为故事线格式"""
    alerts = chain.get("alerts", [])
    severity_map = {"critical": 100, "high": 75, "medium": 50, "low": 25}

    return {
        "id": chain.get("chain_id", ""),
        "confidence": chain.get("confidence", 50),
        "attackPhase": chain.get("attack_phase", "Unknown"),
        "summary": chain.get("summary", f"检测到 {len(alerts)} 条关联告警"),
        "assetCount": chain.get("asset_count", len(set(a.get("src_ip", "") for a in alerts))),
        "firstActivity": chain.get("first_alert_time", datetime.now().isoformat()),
        "lastActivity": chain.get("last_alert_time", datetime.now().isoformat()),
        "threatIntelMatch": chain.get("threat_intel_score", 0),
        "alerts": [
            {
                "id": a.get("alert_id", f"alert-{i}"),
                "timestamp": a.get("timestamp", datetime.now().isoformat()),
                "source": a.get("source", "unknown"),
                "signature": a.get("alert_signature", "Unknown"),
                "severity": a.get("severity", "medium")
            }
            for i, a in enumerate(alerts[:5])
        ]
    }


def _build_attack_graph_from_chain(chain: Dict[str, Any]) -> Dict[str, Any]:
    """将攻击链转换为攻击图数据"""
    alerts = chain.get("alerts", [])
    nodes = []
    edges = []

    # 添加源 IP 节点
    src_ips = set(a.get("src_ip", "") for a in alerts if a.get("src_ip"))
    for i, src_ip in enumerate(src_ips):
        nodes.append({
            "id": f"node-src-{i}",
            "type": "ip",
            "label": src_ip,
            "severity": "high",
            "data": {"ip": src_ip, "role": "attacker"}
        })

    # 添加目标资产节点
    dst_ips = set(a.get("dst_ip", "") for a in alerts if a.get("dst_ip"))
    for i, dst_ip in enumerate(dst_ips):
        nodes.append({
            "id": f"node-dst-{i}",
            "type": "host",
            "label": dst_ip,
            "severity": "medium",
            "data": {"ip": dst_ip, "role": "target"}
        })

    # 添加边
    for src_ip in src_ips:
        for dst_ip in dst_ips:
            edges.append({
                "id": f"edge-{src_ip}-{dst_ip}",
                "source": f"node-src-{list(src_ips).index(src_ip)}",
                "target": f"node-dst-{list(dst_ips).index(dst_ip)}",
                "type": "confirmed",
                "animated": True
            })

    return {"nodes": nodes, "edges": edges}


# ========== 故事线列表 API ==========

@router.get("/storylines")
async def list_storylines(
    time_start: Optional[str] = Query(default=None, description="开始时间 ISO 格式"),
    time_end: Optional[str] = Query(default=None, description="结束时间 ISO 格式"),
    severities: Optional[str] = Query(default=None, description="逗号分隔的严重级别"),
    confidence_min: Optional[int] = Query(default=0, ge=0, le=100, description="最低置信度"),
    confidence_max: Optional[int] = Query(default=100, ge=0, le=100, description="最高置信度"),
    sources: Optional[str] = Query(default=None, description="逗号分隔的数据源"),
) -> List[Dict[str, Any]]:
    """
    获取故事线列表

    按置信度降序返回，支持多维度筛选。
    """
    try:
        neo4j = _get_neo4j_client()

        # 构建 Cypher 查询
        cypher = """
        MATCH (c:AttackChain)
        WHERE c.status = 'active'
        """

        params = {}

        # 时间范围过滤
        if time_start:
            cypher += " AND c.first_alert_time >= $time_start"
            params["time_start"] = time_start
        if time_end:
            cypher += " AND c.last_alert_time <= $time_end"
            params["time_end"] = time_end

        # 置信度过滤
        cypher += " AND c.confidence >= $confidence_min AND c.confidence <= $confidence_max"
        params["confidence_min"] = confidence_min
        params["confidence_max"] = confidence_max

        cypher += """
        OPTIONAL MATCH (c)-[:CONTAINS]->(a:Alert)
        RETURN c.chain_id as chain_id,
               c.confidence as confidence,
               c.attack_phase as attack_phase,
               c.summary as summary,
               c.first_alert_time as first_alert_time,
               c.last_alert_time as last_alert_time,
               c.threat_intel_score as threat_intel_score,
               collect(DISTINCT {
                   alert_id: a.alert_id,
                   timestamp: a.timestamp,
                   src_ip: a.src_ip,
                   dst_ip: a.dst_ip,
                   alert_signature: a.alert_signature,
                   severity: a.severity,
                   source: a.source
               }) as alerts
        ORDER BY confidence DESC
        LIMIT 50
        """

        results = neo4j.execute_query(cypher, params)
        neo4j.close()

        # 转换格式
        storylines = []
        for record in results:
            chain = dict(record)
            chain["alerts"] = [a for a in chain.get("alerts", []) if a.get("alert_id")]
            storylines.append(_build_storyline_from_chain(chain))

        return storylines

    except Exception as e:
        logger.error(f"获取故事线列表失败: {e}")
        return []


# ========== 攻击图数据 API ==========

@router.get("/graph/{story_id}")
async def get_attack_graph(
    story_id: str,
    time_start: Optional[str] = Query(default=None, description="开始时间"),
    time_end: Optional[str] = Query(default=None, description="结束时间"),
) -> Dict[str, Any]:
    """
    获取攻击链路图数据

    根据故事线 ID 返回节点和边信息，用于可视化攻击路径。
    """
    try:
        neo4j = _get_neo4j_client()

        cypher = """
        MATCH (c:AttackChain {chain_id: $story_id})
        OPTIONAL MATCH (c)-[:CONTAINS]->(a:Alert)
        RETURN c.chain_id as chain_id,
               c.confidence as confidence,
               c.attack_phase as attack_phase,
               collect(DISTINCT {
                   alert_id: a.alert_id,
                   timestamp: a.timestamp,
                   src_ip: a.src_ip,
                   dst_ip: a.dst_ip,
                   alert_signature: a.alert_signature,
                   severity: a.severity
               }) as alerts
        LIMIT 1
        """

        results = neo4j.execute_query(cypher, {"story_id": story_id})
        neo4j.close()

        if not results:
            return {"nodes": [], "edges": []}

        chain = dict(results[0])
        chain["alerts"] = [a for a in chain.get("alerts", []) if a.get("alert_id")]

        return _build_attack_graph_from_chain(chain)

    except Exception as e:
        logger.error(f"获取攻击图失败: {e}")
        return {"nodes": [], "edges": []}


# ========== 时间线事件 API ==========

@router.get("/timeline")
async def get_timeline(
    time_start: str = Query(..., description="开始时间 ISO 格式"),
    time_end: str = Query(..., description="结束时间 ISO 格式"),
    sources: Optional[str] = Query(default=None, description="逗号分隔的数据源"),
    layers: Optional[str] = Query(default=None, description="逗号分隔的层级"),
) -> List[Dict[str, Any]]:
    """
    获取时间线事件

    支持 network/endpoint/identity/application 四层分类。
    """
    try:
        neo4j = _get_neo4j_client()

        # 解析来源和层级
        source_list = [s.strip() for s in sources.split(",")] if sources else []
        layer_list = [l.strip() for l in layers.split(",")] if layers else []

        # 构建查询
        cypher = """
        MATCH (e:TimelineEvent)
        WHERE e.timestamp >= $time_start AND e.timestamp <= $time_end
        """

        params = {"time_start": time_start, "time_end": time_end}

        if source_list:
            cypher += " AND e.source IN $sources"
            params["sources"] = source_list

        if layer_list:
            cypher += " AND e.layer IN $layers"
            params["layers"] = layer_list

        cypher += """
        RETURN e.event_id as id,
               e.timestamp as timestamp,
               e.layer as layer,
               e.source as source,
               e.event_type as eventType,
               e.raw_log as rawLog,
               e.entities as entities,
               e.is_anomaly as isAnomaly
        ORDER BY e.timestamp DESC
        LIMIT 200
        """

        results = neo4j.execute_query(cypher, params)
        neo4j.close()

        return [
            {
                "id": r.get("id", f"evt-{i}"),
                "timestamp": r.get("timestamp", ""),
                "layer": r.get("layer", "network"),
                "source": r.get("source", "unknown"),
                "eventType": r.get("eventType", "unknown"),
                "rawLog": r.get("rawLog"),
                "entities": r.get("entities", []),
                "isAnomaly": r.get("isAnomaly", False)
            }
            for i, r in enumerate(results)
        ]

    except Exception as e:
        logger.error(f"获取时间线失败: {e}")
        return []


# ========== 资产上下文 API ==========

@router.get("/assets/{asset_id}")
async def get_asset_context(
    asset_id: str,
) -> Dict[str, Any]:
    """
    获取资产上下文信息

    返回资产的完整上下文，包括基础信息、关联告警、威胁情报匹配。
    """
    try:
        neo4j = _get_neo4j_client()

        # 查询资产信息
        cypher = """
        MATCH (a:Asset {asset_id: $asset_id})
        OPTIONAL MATCH (a)<-[:TARGETS]-(al:Alert)
        OPTIONAL MATCH (a)-[:RELATED_TO]->(ra:Asset)
        OPTIONAL MATCH (a)-[:MATCHES]->(ti:ThreatIntel)
        RETURN a.asset_id as assetId,
               a.asset_type as assetType,
               a.hostname as hostname,
               a.ip as ip,
               a.os as os,
               a.first_seen as firstSeen,
               a.last_seen as lastSeen,
               a.risk_level as riskLevel,
               collect(DISTINCT {
                   alert_id: al.alert_id,
                   timestamp: al.timestamp,
                   alert_signature: al.alert_signature,
                   severity: al.severity,
                   source: al.source
               }) as alerts,
               collect(DISTINCT ra.asset_id) as relatedAssets,
               collect(DISTINCT {
                   indicator: ti.indicator,
                   type: ti.indicator_type,
                   source: ti.source,
                   confidence: ti.confidence,
                   last_seen: ti.last_seen
               }) as threatIntelMatches
        """

        results = neo4j.execute_query(cypher, {"asset_id": asset_id})
        neo4j.close()

        if not results:
            return {
                "assetId": asset_id,
                "assetType": "unknown",
                "hostname": None,
                "ip": None,
                "os": None,
                "firstSeen": "",
                "lastSeen": "",
                "riskLevel": "low",
                "alerts": [],
                "relatedAssets": [],
                "threatIntelMatches": []
            }

        record = dict(results[0])
        return {
            "assetId": record.get("assetId", asset_id),
            "assetType": record.get("assetType", "unknown"),
            "hostname": record.get("hostname"),
            "ip": record.get("ip"),
            "os": record.get("os"),
            "firstSeen": record.get("firstSeen", ""),
            "lastSeen": record.get("lastSeen", ""),
            "riskLevel": record.get("riskLevel", "low"),
            "alerts": [
                {
                    "id": a.get("alert_id", ""),
                    "timestamp": a.get("timestamp", ""),
                    "source": a.get("source", "unknown"),
                    "signature": a.get("alert_signature", "Unknown"),
                    "severity": a.get("severity", "medium")
                }
                for a in record.get("alerts", []) if a.get("alert_id")
            ],
            "relatedAssets": [r for r in record.get("relatedAssets", []) if r],
            "threatIntelMatches": [
                {
                    "indicator": m.get("indicator", ""),
                    "type": m.get("type", "unknown"),
                    "source": m.get("source", "unknown"),
                    "confidence": m.get("confidence", 0),
                    "lastSeen": m.get("last_seen", "")
                }
                for m in record.get("threatIntelMatches", []) if m.get("indicator")
            ]
        }

    except Exception as e:
        logger.error(f"获取资产上下文失败: {e}")
        return {
            "assetId": asset_id,
            "assetType": "unknown",
            "hostname": None,
            "ip": None,
            "os": None,
            "firstSeen": "",
            "lastSeen": "",
            "riskLevel": "low",
            "alerts": [],
            "relatedAssets": [],
            "threatIntelMatches": []
        }


# ========== 威胁狩猎查询 API ==========

@router.post("/hunting")
async def hunt_threats(
    query: Dict[str, Any]
) -> Dict[str, Any]:
    """
    执行威胁狩猎查询

    支持多条件组合查询，返回匹配的事件列表。
    """
    try:
        filters = query.get("filters", [])
        logic = query.get("logic", "AND")
        time_range = query.get("timeRange")

        if not filters:
            return {"total": 0, "events": [], "visualization": None}

        neo4j = _get_neo4j_client()

        # 构建 WHERE 条件
        conditions = []
        params = {}

        for i, f in enumerate(filters):
            field = f.get("field", "")
            operator = f.get("operator", "=")
            value = f.get("value", "")

            if not field:
                continue

            # 映射字段名
            field_map = {
                "src_ip": "a.src_ip",
                "dst_ip": "a.dst_ip",
                "user": "a.user",
                "hostname": "a.hostname",
                "alert_signature": "a.alert_signature",
                "mitre_tactic": "a.mitre_tactic",
                "severity": "a.severity"
            }

            neo_field = field_map.get(field, f"a.{field}")

            param_name = f"val_{i}"
            if operator == "=":
                conditions.append(f"{neo_field} = ${param_name}")
            elif operator == "!=":
                conditions.append(f"{neo_field} <> ${param_name}")
            elif operator == "contains":
                conditions.append(f"{neo_field} CONTAINS ${param_name}")
            elif operator == "starts_with":
                conditions.append(f"startsWith({neo_field}, ${param_name})")
            elif operator == "ends_with":
                conditions.append(f"endsWith({neo_field}, ${param_name})")

            params[param_name] = value

        if time_range:
            conditions.append(f"a.timestamp >= $time_start")
            conditions.append(f"a.timestamp <= $time_end")
            params["time_start"] = time_range.get("start", "")
            params["time_end"] = time_range.get("end", "")

        if not conditions:
            return {"total": 0, "events": [], "visualization": None}

        where_clause = f" {logic} ".join(conditions)

        cypher = f"""
        MATCH (a:Alert)
        WHERE {where_clause}
        RETURN a.alert_id as id,
               a.timestamp as timestamp,
               a.layer as layer,
               a.source as source,
               a.event_type as eventType,
               a.raw_log as rawLog,
               [a.src_ip, a.dst_ip, a.user] as entities,
               a.is_anomaly as isAnomaly
        ORDER BY a.timestamp DESC
        LIMIT 100
        """

        results = neo4j.execute_query(cypher, params)
        neo4j.close()

        events = [
            {
                "id": r.get("id", f"hunt-{i}"),
                "timestamp": r.get("timestamp", ""),
                "layer": r.get("layer", "network"),
                "source": r.get("source", "unknown"),
                "eventType": r.get("eventType", "unknown"),
                "rawLog": r.get("rawLog"),
                "entities": [e for e in r.get("entities", []) if e],
                "isAnomaly": r.get("isAnomaly", False)
            }
            for i, r in enumerate(results)
        ]

        return {
            "total": len(events),
            "events": events,
            "visualization": {
                "type": "table",
                "data": {"columns": ["时间", "事件", "来源", "实体"], "rows": events}
            } if events else None
        }

    except Exception as e:
        logger.error(f"威胁狩猎查询失败: {e}")
        return {"total": 0, "events": [], "visualization": None}
