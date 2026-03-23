-- 攻击链查询模板

-- 查找某 IP 的完整攻击链
MATCH (chain:AttackChain)-[:TARGETS]->(a:Asset {ip: $target_ip})
MATCH path=(chain)<-[:PART_OF]-(alert:Alert)
RETURN chain, alert
ORDER BY alert.timestamp

-- 按时间范围查询攻击链
MATCH (c:AttackChain)
WHERE c.start_time >= datetime($start_time)
  AND c.start_time <= datetime($end_time)
RETURN c
ORDER BY c.start_time DESC

-- 查询某源 IP 的所有攻击链
MATCH (a:Alert {src_ip: $src_ip})-[:PART_OF]->(c:AttackChain)
RETURN c, collect(a) as alerts
ORDER BY c.start_time DESC

-- 关联告警之间的关联关系
MATCH (a1:Alert)-[r:CORRELATED_VIA_IP]->(a2:Alert)
WHERE a1.alert_id IN $alert_ids
RETURN a1, a2, r
