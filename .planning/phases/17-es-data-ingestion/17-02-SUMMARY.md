# Phase 17 Plan 02: ES 告警过滤查询 + 字段映射 + OCSF 格式转换

## 执行摘要

**完成时间:** 2026-04-03T03:18:29Z
**提交:** bbf383a
**任务数:** 3/3

## 一句话总结

实现 ES 日志拉取与解析接入 - 替换全量查询为告警过滤查询，添加字段映射规则和 OCSF 格式转换

## 任务执行记录

| # | 任务 | 状态 | 提交 | 文件 |
|---|------|------|------|------|
| 1 | 替换 match_all 为告警过滤查询 | ✅ | bbf383a | logstash/pipeline/es-input.conf |
| 2 | 添加告警字段映射规则 | ✅ | bbf383a | logstash/pipeline/es-input.conf |
| 3 | 添加 OCSF 格式转换输出结构 | ✅ | bbf383a | logstash/pipeline/es-input.conf |

## 验证结果

```bash
# match_all 已移除
grep "match_all" logstash/pipeline/es-input.conf && echo "FAIL" || echo "PASS"
# PASS: match_all removed

# 告警过滤条件存在
grep -E "alert.severity|severity|risk_score" logstash/pipeline/es-input.conf
# 找到: alert.severity, severity, risk_score

# 字段映射规则数量
grep -c "add_field" logstash/pipeline/es-input.conf
# 14 个 add_field 调用

# OCSF 结构字段
grep -E "category_uid.*2|class_uid.*2001" logstash/pipeline/es-es-input.conf
# category_uid => 2, class_uid => 2001

# 临时字段清理
grep "remove_field.*alert_level" logstash/pipeline/es-input.conf
# remove_field => ["alert_level", ...]
```

## 完成内容

### Task 1: 替换 match_all 为告警过滤查询
- 将 `match_all` 全量查询替换为告警过滤条件
- 时间范围: `now-1h` 到 `now`
- 告警级别过滤: `alert.severity` 和 `severity` 为 high/critical
- 风险分数过滤: `risk_score >= 70`

### Task 2: 添加告警字段映射规则
- `severity_id`: 告警级别数值映射 (low=1, medium=2, high=3, critical=4)
- `alert_title` / `alert_desc`: 告警标题和描述
- `src_ip` / `dst_ip`: 源目 IP 地址
- `src_port` / `dst_port`: 源目端口
- `user_name`: 用户名（认证告警）
- `device_hostname`: 设备主机名
- `product_name` / `product_vendor`: 产品信息

### Task 3: 添加 OCSF 格式转换输出结构
- `category_uid = 2` (Detective Control / Findings)
- `class_uid = 2001` (Security Finding)
- `type_uid = 200101` (activity_id=1)
- `time`: Unix Epoch 毫秒
- `severity`: 标准化告警级别
- `status_id = 1` / `status = "New"`: 状态
- `finding_info`: 标题和描述对象
- `observables`: 可观察对象数组 (IP、用户名)
- `device`: 设备信息
- `metadata`: 产品元信息
- 清理中间临时字段

## 技术决策

| 决策 | 说明 |
|------|------|
| D-08 | 使用 dissect/json filter 避免 Grok 正则（性能 5-10 倍） |
| D-06 | 时间戳标准化使用 `date filter` + `Asia/Shanghai` 时区 |
| D-07 | 移除 ES 6.x `_type` metadata |
| ES-03 | 告警过滤条件（时间范围 + severity/risk_score） |

## 变更文件

| 文件 | 变更类型 | 行数变化 |
|------|----------|----------|
| logstash/pipeline/es-input.conf | 修改 | +183 |

## 下一步

- 继续执行 Plan 17-03 (验证 Logstash Pipeline 配置)
