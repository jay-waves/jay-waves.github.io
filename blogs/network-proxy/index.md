# 折腾中国大陆网络代理的终极方案

## TL;DR 

本文介绍了处于大陆网络环境中，配置并使用 Mihomo 裸内核进行科学上网的详细技术步骤。

**本文仅供技术研究与合规讨论，不构成操作建议或法律建议。读者应自行确认相关行为符合所在地法律法规及服务条款。本文不鼓励任何违法、违规或侵害第三方权益的使用方式**。

## 什么是“网络代理”

*网路代理*是一种转发机制：用户（客户端）将网络请求转发给代理服务器，再由代理去访问目标网站并返回结果。代理的主要作用是修改网络出口，隐藏真实网络行为，以访问受限或不可直连的网络资源。代理也能隔离网络，实现访问控制，不过这里按下不表。

Clash 是一款客户端代理转发工具，用于将用户的网络流量中转到代理节点，并提供分流、过滤等实用网络功能。Clash 自身不提供代理功能，需要配合外部供应商提供的代理服务器使用（俗称“机场”）。机场负责搭建代理服务器，并按转发流量计费售卖给用户，在用户视角里每个服务器都是一个网络 IP（俗称“节点），用户将 IP 和相关鉴权信息配置给 Clash 就可以实现科学上网。

本文主要介绍如何手动配置 Clash。Clash 是一个命令行工具（俗称“内核”），我们通过撰写 `config.yaml` 配置文件来控制它。这有一定难度，因此会有一些 GUI 程序，如  ClashFroWindows, ClashVerge 对相应功能进行封装和简化。本文会论述：本人为什么放弃了使用 GUI 程序，而开始直接配置和使用 Clash 内核。

网络代理需要搭配*加密网络协议*来隐藏网络行为，否则会被CN大陆各类防火墙设备识别和拦截。虽然 TLS 已经为计算机网络的应用层提供了加密服务，我们仍希望更底层 传输层、网络层 的网络路由信息和行为也被加密保护。因此网络代理协议有专用的 Shadowsocks, VMess, AnyTLS 等协议。

```mermaid 
---
config:
  theme: neutral
  themeVariables:
    fontSize: 11px
  flowchart:
    nodeSpacing: 15
    padding: 8
---
flowchart TB
    subgraph PC["PC"]
        direction TB
        Apps["Apps / VMs"]
        Client["Local Proxy Client"]

        Apps -->|"SOCKS5 / HTTP"| Client
    end

    Client -->|"Shadowsocks / VMess / AnyTLS"| Server["Remote Proxy Server"]

    Server -->|"HTTPS / Other Traffic"| Websites["Websites outside GFW<br/>Apple, Google, GitHub, etc."]
```


## 常见解决方案

开箱即用的代理客户端：
* ShadowSocket（小火箭）：手机使用这个足够
* Clash for Windows：停止维护
* Clash-Verge：停止维护
* Clash-Verge-Rev：**目前主流** 
* V2RayN：使用也广泛。UI 和配置逻辑稍微老旧。

代理客户端是对代理内核的封装，主流内核有：
* xray
* sing-box 
* clash：停止维护
* mihomo：clash 的继任者，**目前主流**

用于代理的网络协议：
* VLESS / VMess ：Xray 项目开发的协议
* Trojan ：流量特征很像 HTTPS 的协议
* ShadowSocks (ss) ：比较早的协议，容易被识别
* Hysteria2 ：基于 QUIC 的代理协议

## 关于使用裸 Mihomo 内核的优缺点

此前使用 Clash-Verge-Rev，由它封装和托管 Mihomo 内核，但是遇到了几个问题：
* GUI 太重，始终运行在后台的 Webview Runtime 中
* 配置规则比较麻烦，不能对 Mihomo 内核进行直接管理。
* 无界面的服务器没办法用

迁移到 Mihomo 裸内核的优点：
1. 运行时后台只有一个可执行文件，轻量。可以用 Web 面板管理，也可以用配置文件管理。
2. 封装为自启动服务，在 Windows、Linux 都能无感使用。
3. 配置规则非常方便，直接修改 Mihomo 内核的配置文件即可。
4. 在服务器或家庭网关上配置后，其他内网机器可直接将该机器视为网络代理，使用方便。

迁移到 Mihomo 裸内核的缺点：
1. 学习和配置成本比较高，不能开箱即用，资料比较分散。建议使用 AI 帮助。
2. 不能直接解析订阅链接 URL，需要用 sub-store 转换。这是一个很麻烦的点，下文有解决办法。

## 下载与安装

* 下载符合操作系统要求的 [`mihomo` 内核](https://github.com/MetaCubeX/mihomo/releases)
* 下载控制面板 [`MetaCubeX`](https://github.com/MetaCubeX/metacubexd)，或者直接用[纯网页应用](https://metacubex.github.io/metacubexd/)
* 获取一个机场的订阅链接，用于获取实际可代理上网的节点。
* 按照本文的方法，自定义配置文件 `config.yaml` 。
* 按操作系统要求的方式将 `mihomo` 封装为自启动服务。例如，Linux 用 systemd，Windows 用 WinSW 。

## 配置 Mihomo DNS 

推荐本机操作系统的 DNS 服务器配置为 `0.0.0.0:53`，Mihomo 在 `0.0.0.0:53` 端口提供 DNS 代理。
这样 Mihomo 能够提前知晓 ip 和域名的对应关系，关于使用分流规则。否则，应用只请求一个 IP 地址，
Mihomo 仍然需要重复请求一次 NS，才能完成域名映射。

Mihomo DNS 有两种增强模式： `redir-host / fake-ip`。在一些情况下，两个不同的域名可能共用 
同一个 CDN IP ，这可能导致分流规则应用出错。Mihomo DNS `fake-ip` 模式是为了解决这个问题。
`fake-ip` 还有一个有点，就是应用向 Mihomo DNS 请求 NS 时，可以立即获得结果并返回，不需要
等待实际的 DNS 完成，后续全部代理给 Mihomo。

```yaml
dns:
  enable: true
  listen: "0.0.0.0:53"
  enhanced-mode: fake-ip
  ipv6: false
  use-hosts: true
  use-system-hosts: true
  default-nameserver:
    - 223.5.5.5
    - 202.112.128.51 # ns.lib.buaa.edu.cn 
  nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query
  nameserver-policy: # 将北航内网服务器的域名查询交给内网 NS Server 负责
    "*.buaa.edu.cn": 202.112.128.51
```


## 配置 Mihomo 代理来源

### 配置 subconverter 


因为 Mihomo 内核直接读取 Proxies 订阅列表，而不是机场提供的订阅 URL，因此需要一个转化工具，
将 URL 转换为 Mihomo 可识别的 YAML 节点列表。常见工具如 Sub-Store 或 subconverter，
这里推荐 [subconverter](https://github.com/MetaCubeX/subconverter)，部署非常轻量。

subconverter 通过 HTTP 服务来提供接口，假设其运行在本地 `25500` 端口，其接口形式为：

```url
http://127.0.0.1:25500/sub?target=XXX&url=YYY
```

URL 参数：
* `target=XXX` 是指目标格式，这里用 `target=clash`
* `url=YYY` 是指来源 URL，由机场厂商提供，需要用 URL Encoded 后的格式，如 `url=https%3A%2F%2Fc7a91e3b%2D84d2%2D4c6f%2D`

可以将 subconverter 运行在本地，也可以将其持续部署在服务器上，用 nginx 反向代理出接口。
如果在本机部署 subconverter，需要注意转发给 subconverter 的流量也可能被 Mihomo 捕获，
导致部分代理商 URL 走了错误的分流无法访问。（见下文-分流规则）

### 配置 Mihomo 代理供应商

将 Subconverter 清洗好的节点导入 Mihomo 内核，作为一个 Proxy-Privider。
下面的配置每天向 subconverter 请求一次更新，获取的节点通过 `gstatic` 自动测试与外网的连通性。

```yaml
proxy-providers:
  teacat:
    url: http://127.0.0.1:25500/sub?target=clash&url=https%xxxxxxxx
    path: ./proxies/teacat.yaml
    type: http 
    use-system-proxy: false 
    interval:  86400 
    health-check:
      enable: true 
      url: https://www.gstatic.com/generate_204
      interval: 600 
      timeout: 3000 
      lazy: false
      expected-status: 204
```

节点健康检查可用的网址 (health-check):
* gstatic.com 
* np.cloudflare.com 
* openai/models/v1

## 配置 Mihomo 代理组

代理组用于从所有可用节点中选出一个最佳节点，作为网络出站后的代理。代理组主要有几种类型：
* url-test : 自动测速选择节点
* select : 用户手动选择路由节点 
* load-balance : 给请求分配多个负载节点（支持一致性哈希）

除了自定义代理节点组，Mihomo 还有其他几种内置代理组：
* `PROXY` 直连 
* `REJECT` 拒绝
* `REJECT-DROP` 拒绝，并且不响应，静默丢弃 

```yaml
proxy-groups:
  - name: RABBIT 
    type: url-test 
    use: [rabbit]  # url-test 不测速，只负责拿到 health-check 结果并排序选择
    interval: 300  
    lazy: true     # 使用时才排序选择
    tolerance: 50  # 有更优结果时，不要立即切换过去，避免反复横跳。差距大于 50ms 才切换。

  - name: TEACAT
    type: url-test 
    use: [teacat] 
    interval: 300 
    lazy: true 
    tolerance: 50 

  - name: GLOBAL
    type: select
    proxies:
      - DIRECT
      - RABBIT
      - TEACAT
```

推荐在 `proxy-providers` 中进行节点测速。Mihomo 文档明确说：**后续 `proxy-groups` url-test 并不会负责
通过 `use: proxy-providers` 引入的网络节点的测速工作。** proxy-groups url-test 只应该负责：拿到 
proxy-providers health-check 的测速结果，然后根据延迟进行最优选择。


## 配置 Mihomo 分流规则

针对不同的网络访问目标，可能希望采取不同的网络路由策略，比如：
* 机构内网域名，如 `xxx.edu.cn` ，希望直连，不经过网络代理。
* 局域网地址，如 `192.168.xx.xxx`，希望直连，不经过网络代理。
* 中国境内网站，如 `baidu.com`，希望直连，不经过网络代理。 
* `chatgpt.com`，希望流量通过地处美国的网络代理节点。
* `google.com`，希望流量经过网络代理节点，不直连。

针对以上需求，mihomo 提供部分分流类型如下：

| 分流类型                 | 描述                         | 示例                                         |
| -------------------- | -------------------------- | ------------------------------------------ |
| `GEOIP`              | 根据目标 IP 所属国家或地区匹配          | `GEOIP,CN,DIRECT`                          |
| `GEOSITE`            | 根据 Geosite 域名分类匹配          | `GEOSITE,youtube,PROXY`                    |
| `DOMAIN-SUFFIX`      | 匹配指定域名及其所有子域名              | `DOMAIN-SUFFIX,google.com,PROXY`           |
| `DOMAIN-KEYWORD`     | 匹配包含指定关键字的域名               | `DOMAIN-KEYWORD,google,PROXY`              |
| `RULE-SET`           | 引用 `rule-providers` 提供的规则集 | `RULE-SET,direct,DIRECT`                   |
| `IN-PORT`            | 根据 Mihomo 入站端口或端口范围匹配      | `IN-PORT,7890,PROXY`                       |
| `IN-TYPE`            | 根据 Mihomo 入站类型匹配           | `IN-TYPE,SOCKS/HTTP,PROXY`                 |
| `PROCESS-NAME`       | 精确匹配进程名称                   | `PROCESS-NAME,chrome.exe,PROXY`            |
| `PROCESS-NAME-REGEX` | 使用正则表达式匹配进程名称              | `PROCESS-NAME-REGEX,(?i)Telegram,PROXY`    |
| `IP-CIDR`            | 匹配 IPv4 或 IPv6 CIDR 地址范围   | `IP-CIDR,192.168.0.0/16,DIRECT,no-resolve` |
| `IP-SUFFIX`          | 匹配指定的 IP 地址后缀范围            | `IP-SUFFIX,8.8.8.8/24,PROXY`               |
| `MATCH`              | 无条件匹配所有剩余请求，通常作为最终兜底规则     | `MATCH,PROXY`                              |


分流规则的格式为：`rult-type,domain,proxy-group`。意思是，在该分流类型下，匹配作用域的所有流量，走指定的代理组。
规则的优先级是从上到下优先匹配。

```yaml

rule-providers:
    icloud:
      type: http
      behavior: domain
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt"
      path: ./rules/icloud.yaml
      interval: 86400

    direct:
      type: http
      behavior: domain
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt"
      path: ./rules/direct.yaml
      interval: 86400

    private:
      type: http
      behavior: domain
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt"
      path: ./rules/private.yaml
      interval: 86400

rules: # 格式：分流类型,作用域,代理组
  - DOMAIN-SUFFIX,buaa.edu.cn,DIRECT
  - GEOIP,LAN,DIRECT
  - GEOSITE,apple,GLOBAL
  - GEOSITE,CN,DIRECT
  - RULE-SET,direct,DIRECT
  - MATCH,GLOBAL
```

## 总览

<img src="http://oss.jay-waves.cn/til/mihomo-dashboard.webp"/>

### 架构图

```mermaid 
---
config:
  theme: neutral
  themeVariables:
    fontSize: 10px  
  flowchart:
    nodeSpacing: 15
    padding: 8
---
flowchart TB
    subgraph Provisioning["Proxy Provisioning"]
        Providers["Subscription Servers"]
        Subconverter["Subconverter"]
        Nodes["Proxy Providers"]

        Providers --> Subconverter
        Subconverter -->|"proxy-providers"| Nodes
    end

    subgraph RuleProvisioning["Rule Provisioning"]
        RuleProviders["Remote Servers"]
        RuleProvider["Rule Providers"]

        RuleProviders -->|"rule-providers"| RuleProvider
    end

    subgraph Routing["Traffic Routing"]
        User["User Traffic"]
        Inbound["Mihomo Inbound: TUN / Mixed"]
        Metadata["Destination: Domain / IP / Process"]
        Rules["Routing Rules"]
        Groups["Proxy Groups"]
        SelectedNode["Selected Proxy Node"]
        Remote["Remote Proxy Server"]
        Destination["Destination Website"]
        Reject["Rejected"]
        DNS["DNS Resolver"]

        User --> Inbound
        Inbound --> Metadata
        Metadata --> Rules

        Rules -->|"PROXY"| Groups
        Groups --> SelectedNode
        SelectedNode --> Remote
        Remote --> Destination

        Rules -->|"DIRECT"| Destination
        Rules -->|"REJECT"| Reject

        Inbound -.->|"DNS queries"| DNS
        DNS -.->|"Domain / IP result"| Metadata
    end

    RuleProvider -.-> |"third-party rules"| Rules
    Nodes -.->|"Available nodes"| Groups
```

### 例子：给 AI 网站配置独立代理链路

假设我们有节点文件 `./proxies/ai.yaml`，将其导入 Mihomo，然后过滤掉不可达的 中国香港/中国澳门 等地区的节点。
每个节点通过 openai 的状态接口来测速，选出最终的优质节点用于访问 ChatGPT 网页。

这避免了因为节点质量问题，导致被 ChatGPT 等人工智能服务屏蔽。

```yaml
proxy-providers:
  ai:
    type: http 
    path: ./proxies/ai.yaml
    url: http://127.0.0.1:25500/sub?target=clash&url=https%xxxxxxx
    filter: "(?i)(美国|美國|US|USA|United States|日本|JP|Japan|新加坡|SG|Singapore|台湾|台灣|TW|Taiwan)"
    exclude-filter: "(?i)港|香港|hk|hongkong|hong kong|澳门|澳門|MO|Macao|Macau"
    interval: 86400

    health-check:
      enable: true 
      expected-status: 401
      url: "https://api.openai.com/v1/models"
      interval: 900
      timeout: 3000
      lazy: false

proxy-groups:
  - name: AI
    type: url-test
    use: [ai]
    lazy: true
    interval: 300
    tolerance: 50

rule-providers:
    openai:
      type: http
      behavior: classical
      url: "https://raw.githubusercontent.com/G4free/clash-ruleset/main/ruleset/ChatGPT.yaml"
      path: ./rules/ChatGPT.yaml
      interval: 86400

rules:
  - GEOIP,LAN,DIRECT
  - RULE-SET,openai,AI
```

## 其他配置

### 包装成开机启动服务

Windows 端，推荐用 WinSW 将 Mihomo.exe 包装为可开机自启动的服务。
1. 将 [WinSW.exe](https://github.com/winsw/winsw) 重命名为 `mihomo-sc.exe`
2. 配置文件如下，命名为 `mihomo-sc.xml` 
3. 用管理员权限进行服务安装和启动：`mihomo-sc.exe install && mihomo-sc.exe start`

这里假设 `mihomo.exe` 内核本体放在 `D:\bin\mihomo` 目录下，配置文件 `config.yaml` 也放在该目录，因此将 
工作目录配置为 `D:\bin\mihomo`。
但，按 Windows 实际惯例，应该将 `mihomo.exe` 独立放在某个加入 PATH 的路径，然后工作目录使用 
`%LOCALAPPDATA%/mihomo` ，在其中存放所有程序运行时数据。

```yaml
<service>
  <id>mihomo</id>
  <name>mihomo</name>
  <description>mihomo proxy core</description>

  <executable>D:\bin\mihomo\mihomo.exe</executable>
  <arguments>-d D:\bin\mihomo</arguments>
  <workingdirectory>D:\bin\mihomo</workingdirectory>

  <startmode>Automatic</startmode>

  <onfailure action="restart" delay="5 sec"/>
  <onfailure action="restart" delay="10 sec"/>
  <onfailure action="none"/>
</service>
```

`subconverter` 也可以这样配置为服务。不过注意，WinSW 默认是以 SystemLocal 用户注册的，不是本用户。

### 配置为开机启动脚本

如果决定用 winsw 包装、托管服务太麻烦，可以用 Windows 的自启动程序目录：
1. Win + R ，输入 shell:startup 
2. 将下面的 vbs 脚本放在该目录里 

```vbs
Set shell = CreateObject("WScript.Shell")
  shell.Run """D:\bin\mihomo.exe"" -d ""C:\Users\jay-waves\AppData\Local\mihomo""", 0, False
```

### 配置局域网的统一代理出口

局域网的服务器、硬件比较多，挨个配置 mihomo 服务确实麻烦。可以将一个机器作为 Proxy ，
实际运行 Mihomo 内核，其他机器通过局域网代理，将流量转发到该 Proxy 即可。

Mihomo 配置很简单：

```yaml
allow-lan: true
mixed-port: 7890
bind-address: "*"
```

注意，**一定要小心安全问题**。绑定所有地址的代价是，所有内网机器都能通过你的机器作为代理。
解决办法：
* 调整防火墙出战、入站规则。仅允许内网固定地址访问该端口入站。
* 要求用户密码（如下），然后通过 `http://you:passwd@192.168.xx.xxx:7890` 访问。

```yaml
authentication: 
  - "you:passwd"
```

### 配置本地控制面板

推荐来自 Mihomo 官方的 [MetacubeXD](https://github.com/metacubex/metacubexd)，是一个纯前端的 Web 网页。
不会一直挂在后台，由 Mihomo 内核监听端口并适时拉起。这个端口可以暴露出去，在其他设备访问（注意安全性）。

将打包好的 MetacubeXD 解压到某个目录下，假设是 `E:/metacubexd-ui` 。将面板端口暴露为 `9090`，
此后就可以在浏览器本地访问 `http://127.0.0.1:9090`。

```yaml
external-controller: 127.0.0.1:9090
external-ui:  "E:/metacubexd-ui" 
```

### 调优 (TODO)

TUN 模式: 工作于[网络层](https://github.com/jay-waves/til/network-l3/IPv4.md). 处理 IP 层及以上的协议.

TAP 模式: 工作于[数据链路层](https://github.com/jay-waves/til/data-link-l2.md), 处理以太网帧, 模拟真实的网卡环境, 如虚拟机组网和桥接网络.

TUN 模式会创建一个虚拟网卡 (utun0), 在网络层就拦截和重定向系统的网络流量. 

有几个重要特点:
1. 所有流量 (TCP, UDP, ICMP, DNS) 都会被截获, 因此都会被代理软件的规则 (Rules) 处理
2. 某些应用 (系统更新, 后台服务) 会忽略系统代理, TUN 可以强制接管. 因此其对流量的控制也精准. 
3. **hosts 文件和防火墙规则可能被 TUN 模式直接覆盖, 因为流量在网络层就被接管.**

```yaml
tun:
  enable: false
  stack: system
  auto-route: true
  auto-detect-interface: true
  dns-hijack:
    - any:53

# 降低性能损耗
ipv6: false
tcp-concurrent: false # 解析出多个 IP 并行尝试
keep-alive-interval: 15
```

## 疑难解答

### DoH DNS 

Mihomo DNS 不要孤立配置使用 `DoH` 服务，比如访问 `https://dns.google.com/dns-query` ，会先触发一次 DNS。
如果这次 DNS 查询没有结果（网络不联通），会造成所有网络访问的解析错误。

至少需要配置一个 fallback udp dns 服务。但是我配置时，表现不太稳定。

### UWP 应用

UWP 应用主要指 Microsoft Store 以及用它安装的系列应用, 比如 Apple Music, Microsoft Photos 等。
特点是沙盒化，无法访问本地回环，导致挂 Mihomo 代理失败。解决办法是配置一下权限：

```powershell
sudo checknetisolation loopbackexempt -s

CheckNetIsolation LoopbackExempt -a -n="AppleInc.AppleMusicWin_nzyj5cx40ttqa"
```

### 公司摸鱼需要注意的问题

公司防火墙会做 DNS/IP 流量行为统计，监控员工上网行为。

部分公司，在员工电脑上安装企业根 CA ，使公司网关可以合法伪造 HTTPS 证书，实现 MITM 中间人攻击。
员工的所有 HTTPS 流量都会被公司解密并审查，然后再由公司代理进行外部的网络访问。

因此公司电脑上网时，先检查浏览器网页的证书签发者，是公认权威机构，还是公司自定义 CA。

### 机场跑路

**近期机场频繁跑路，建议不要长期订阅。详见 [机场跑路贴](https://github.com/limbopro/Paolujichang/issues)**
