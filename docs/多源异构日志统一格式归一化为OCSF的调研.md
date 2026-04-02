**OCSF（Open Cybersecurity Schema Framework，开放网络安全架构框架）** 是一个由 AWS、Splunk、IBM 等安全巨头联合发起的开源数据标准。它的核心目标是将不同安全厂商、不同工具产生的安全日志和告警统一到一个标准化的数据模型中，解决安全运营（SecOps）中长期存在的数据孤岛和解析（Parsing）难题。

以下是对 OCSF 的深入调研，以及如何用它来表示各类告警、终端行为和网络行为的最佳实践与示例。

------

### 一、 OCSF 核心概念与数据结构映射

OCSF 将所有的安全事件划分为 **Categories（类别）**，每个类别下有具体的 **Classes（事件类）**。在 OCSF 中，我们不通过厂商格式来分类，而是根据“发生了什么事实”来分类。

#### 1. 各类告警（Alerts / Findings）

所有的安全告警、漏洞扫描结果、合规性违规等，在 OCSF 中都归属于 **Findings（类别 UID: 2）**。

- **Security Finding (Class UID: 2001)**：最常用的告警类，用于表示 EDR、IDS/IPS、WAF、SIEM 等产生的安全威胁告警。
- **Vulnerability Finding (Class UID: 2002)**：用于表示漏扫工具发现的漏洞。
- **表示方法**：重点关注 finding_info（告警详情）、severity_id（严重等级）、state_id（告警状态），并将相关的 IOC（如恶意 IP、Hash）提取到 observables（可观察对象）数组中。

#### 2. 终端的日志和行为（Endpoint Logs & Behaviors）

终端上的各种活动在 OCSF 中归属于 **System Activity（类别 UID: 1）** 和 **Identity & Access Management（类别 UID: 3）**。

- **Process Activity (Class UID: 1007)**：进程创建、终止等（如 Windows Sysmon Event 1）。
- **File Activity (Class UID: 1001)**：文件的创建、修改、删除。
- **Registry Key Activity (Class UID: 1010)**：Windows 注册表操作。
- **Authentication (Class UID: 3002)**：用户登录、登出、认证失败等。
- **表示方法**：通过复杂的嵌套对象描述事件上下文。例如，用 actor.process 表示父进程，用 process 表示当前子进程，用 device 表示产生行为的终端实体。

#### 3. 网络行为（Network Behaviors）

网络层面的通信和协议解析归属于 **Network Activity（类别 UID: 4）**。

- **Network Activity (Class UID: 4001)**：基础的 TCP/UDP 连接日志（如防火墙、VPC Flow Logs）。
- **HTTP Activity (Class UID: 4002)**：Web 流量、代理日志。
- **DNS Activity (Class UID: 4003)**：DNS 解析请求与响应。
- **表示方法**：核心对象是 src_endpoint（源端）、dst_endpoint（目的端），以及包含协议信息的 connection_info 或 http_request。

------

### 二、 OCSF 数据清洗与映射的最佳实践

1. **遵守 type_uid 的计算规则**：
   OCSF 的 type_uid 是一个决定性的唯一标识符。它的计算公式是：class_uid * 100 + activity_id。例如：进程活动 (1007) 中的启动 (Launch, id: 1)，其 type_uid 必须是 100701。
2. **充分利用 Observables（可观察对象）数组**：
   在告警或行为日志中出现的任何有威胁狩猎价值的实体（IP、域名、文件 Hash、邮箱），都应该被复制提取到 observables 数组中。这使得 SIEM 不需要遍历整个复杂 JSON 就能快速匹配威胁情报（TI）。
3. **使用 Profiles（配置文件）补充上下文**：
   如果终端是在云上的虚拟机，你可以附加 Cloud Profile（引入 cloud.provider, cloud.region 等字段），而不需要改变原有的 Process Activity 事件结构。这保证了核心结构的精简。
4. **妥善处理“未映射数据”（Unmapped Data）**：
   永远不要在 OCSF 的标准对象里自创字段。如果厂商原生日志里有一些独特且有用的字段（例如 vendor_specific_score），请将其放入 unmapped 对象中，并将完整的原始日志保存在 raw_data 字段中以备回溯。
5. **时间戳统一化**：
   将所有的事件时间转换为 Unix Epoch 毫秒级时间戳，存入 time 字段中。

------

### 三、 JSON 示例

以下是基于 OCSF Schema 最新版格式的 JSON 示例：

#### 示例 1：安全告警 (Security Finding - Class 2001)

*场景：EDR 报告终端检测到 Mimikatz 恶意软件。*

 code JSON

downloadcontent_copy

expand_less



```
{
  "category_uid": 2,
  "class_uid": 2001,
  "activity_id": 1,
  "type_uid": 200101, 
  "time": 1680436800000,
  "severity_id": 5,
  "severity": "Critical",
  "status_id": 1,
  "status": "New",
  "finding_info": {
    "title": "Malicious Credential Dumping Tool Execution",
    "desc": "Mimikatz execution detected via command line arguments.",
    "product_uid": "crowdstrike_falcon"
  },
  "malware":[
    {
      "name": "Trojan.Mimikatz",
      "classifications": ["Credential Dumper", "Trojan"]
    }
  ],
  "device": {
    "hostname": "FIN-USER-PC01",
    "ip": "192.168.10.55",
    "os": {
      "name": "Windows",
      "version": "10"
    }
  },
  "observables":[
    {
      "type_id": 4,
      "type": "File Name",
      "value": "mimikatz.exe"
    },
    {
      "type_id": 1,
      "type": "IP Address",
      "value": "192.168.10.55"
    }
  ]
}
```

#### 示例 2：终端进程行为 (Process Activity - Class 1007)

*场景：Windows 机器上 Explorer.exe 启动了 cmd.exe。*

 code JSON

downloadcontent_copy

expand_less



```
{
  "category_uid": 1,
  "class_uid": 1007,
  "activity_id": 1, 
  "type_uid": 100701, 
  "time": 1680437000000,
  "message": "Process Creation",
  "actor": {
    "user": {
      "name": "jdoe",
      "uid": "S-1-5-21-3456789012-3456789012-3456789012-1001"
    },
    "process": {
      "name": "explorer.exe",
      "pid": 4512,
      "file": {
        "path": "C:\\Windows\\explorer.exe"
      }
    }
  },
  "process": {
    "name": "cmd.exe",
    "pid": 8920,
    "cmd_line": "cmd.exe /c ping 8.8.8.8",
    "file": {
      "path": "C:\\Windows\\System32\\cmd.exe",
      "hashes":[
        {
          "algorithm_id": 1,
          "value": "8A1... (SHA256)"
        }
      ]
    }
  },
  "device": {
    "hostname": "FIN-USER-PC01",
    "ip": "192.168.10.55"
  }
}
```

#### 示例 3：网络连接行为 (Network Activity - Class 4001)

*场景：防火墙拦截了一次从内部 IP 到外部恶意 IP 的 SSH 连接尝试。*

 code JSON

downloadcontent_copy

expand_less



```
{
  "category_uid": 4,
  "class_uid": 4001,
  "activity_id": 2, 
  "type_uid": 400102, 
  "time": 1680437500000,
  "disposition_id": 2, 
  "disposition": "Blocked",
  "src_endpoint": {
    "ip": "192.168.10.55",
    "port": 54321,
    "vlan_uid": "100"
  },
  "dst_endpoint": {
    "ip": "203.0.113.10",
    "port": 22,
    "location": {
      "country": "US",
      "city": "Unknown"
    }
  },
  "connection_info": {
    "protocol_num": 6, 
    "protocol_ver": "IPv4",
    "direction_id": 2,
    "direction": "Outbound"
  },
  "observables":[
    {
      "type_id": 1,
      "type": "IP Address",
      "value": "203.0.113.10"
    }
  ],
  "metadata": {
    "product": {
      "vendor_name": "Palo Alto Networks",
      "name": "PAN-OS"
    }
  }
}
```

### 总结

在企业中推行 OCSF 标准的最佳实施路径是：**不要让数据源直连分析引擎。** 建议在数据流转层（如 Kafka、Logstash、Vector 或 AWS Security Lake）开发一套解析引擎，将所有多源异构的日志转换（ETL）为上述的 OCSF 格式。
这样一来，你的安全运营团队只需针对 dst_endpoint.ip 或 observables 写一次查询规则或检测逻辑，就能无缝兼容所有厂商（不论是现有的防火墙，还是未来新采购的 EDR）的数据。