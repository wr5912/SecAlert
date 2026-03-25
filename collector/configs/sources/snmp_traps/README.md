# SNMP Trap 采集配置

## 架构
SNMP Trap → snmptrapd → Syslog → Vector → Kafka

## 部署步骤

1. 安装 Net-SNMP:
   apt-get install snmpd snmptrapd

2. 配置 snmptrapd.conf:
   - 修改 VECTOR_HOST 为实际 Vector 服务器地址

3. 启动服务:
   systemctl enable snmptrapd
   systemctl start snmptrapd

4. 配置防火墙放行 UDP 162 端口

## 支持的设备类型
- 网络设备 (Cisco, Juniper, HP)
- UPS设备 (APC, Eaton)
- 打印机
- 存储设备

## 已知限制
- 不同厂商的 SNMP Trap 格式差异大，需要厂商特定 MIB
- Phase 5 只实现通用 Trap 解析
