#import "@local/ypst-template:0.1.0" as theme

#import theme: template, sidenote, theorem, sidenote

#show: template

= My Ultimate Setup for Network Proxies in Mainland China
== TL;DR
This article explains how I configure and use the standalone Mihomo core in a mainland China network
environment.

#strong[This article is for technical research and discussion of compliance only. It is not operational or legal advice. Readers should make sure their actions comply with local laws, regulations, and service terms. This article does not encourage illegal activity, violations, or infringement of third-party rights.]

== What Is a Network Proxy?
A #emph[network proxy] is a forwarding mechanism: a user (the client) sends network requests to a proxy server, which accesses the target website and returns the result. A proxy changes the network egress and can conceal some aspects of network activity to reach resources that are restricted or not directly accessible. Proxies can also isolate networks and enforce access control, though that is outside this article's scope.

Clash is a client-side proxying tool that forwards user traffic through proxy nodes and provides features such as routing and filtering. Clash does not provide proxy servers itself; it must be used with servers from an external provider, often called a “proxy service.” Providers operate the servers and sell access, sometimes charging by traffic. From the user’s perspective, each server is an IP address (a “node”); users configure the address and authentication details in Clash to route traffic through it.

This article focuses on configuring Clash manually. Clash is a command-line tool, often called a “core,” controlled through a `config.yaml` file. This takes some effort, so GUI apps such as Clash for Windows and Clash Verge package and simplify these features. I will explain why I stopped using a GUI app and began configuring and running the core directly.

In mainland China, network proxies need #emph[encrypted transport protocols] to conceal traffic behavior; otherwise, various firewall systems may identify and block them. Although TLS already provides encryption at the application layer, we may also want to protect routing information and behavior at lower layers, such as the transport and network layers. This is why proxy protocols such as Shadowsocks, VMess, and AnyTLS exist.

#raw(
  "flowchart TB\n  subgraph PC[PC]\n    direction TB\n    Apps[Apps / VMs]\n    Client[Local Proxy Client]\n    Apps -->|SOCKS5 / HTTP| Client\n  end\n  Client -->|Shadowsocks / VMess / AnyTLS| Server[Remote Proxy Server]\n  Server -->|HTTPS / Other Traffic| Websites[Websites outside GFW]\n  Websites --> Sources[Apple, Google, GitHub, etc.]",
  lang: "mermaid",
  block: true,
)


== Common Options
Ready-to-use proxy clients:

- Shadowrocket: sufficient for phone use.
- Clash for Windows: discontinued.
- Clash Verge: discontinued.
- Clash Verge Rev: #strong[currently a popular option].
- v2rayN: also widely used, though its UI and configuration model feel dated.

Proxy clients wrap proxy cores. Common cores include:

- xray
- sing-box
- Clash: discontinued.
- Mihomo: Clash's successor and #strong[a popular choice today].

Common proxy protocols:

- VLESS / VMess: protocols developed by the Xray project.
- Trojan: a protocol whose traffic resembles HTTPS.
- Shadowsocks (ss): an older protocol that is easier to identify.
- Hysteria2: a proxy protocol based on QUIC.

== Pros and Cons of Running the Mihomo Core Directly
I previously used Clash Verge Rev to package and manage the Mihomo core, but ran into a few problems:

- The GUI was heavy and ran continuously in a WebView runtime.
- Managing rules was cumbersome, and I could not manage the Mihomo core directly.
- It was not suitable for headless servers.

Advantages of running the Mihomo core directly:

+ Only one executable runs in the background, keeping it lightweight. It can be managed through a web panel or configuration files.
+ It can run as a startup service on both Windows and Linux.
+ Rules are easy to manage by editing the Mihomo configuration file directly.
+ When configured on a server or home gateway, it can serve as a proxy for other machines on the local network.

Disadvantages of running the core directly:

+ The learning and configuration costs are higher. It is not ready to use out of the box, and documentation is scattered. An AI assistant may help.
+ Subscription URLs cannot be parsed directly; they need to be converted with a tool such as Sub-Store. This is inconvenient, but a workaround appears below.

== Download and Installation
- Download the #link("https://github.com/MetaCubeX/mihomo/releases")[`mihomo` core] for your operating system.
- Download the #link("https://github.com/MetaCubeX/metacubexd")[MetaCubeX dashboard], or use the #link("https://metacubex.github.io/metacubexd/")[web app] directly.
- Obtain a subscription URL from a proxy provider to get usable proxy nodes.
- Create a custom `config.yaml` using the instructions in this article.
- Configure `mihomo` to start automatically using the method for your operating system, such as systemd on Linux or WinSW on Windows.

== Configure Mihomo DNS
I recommend configuring the local operating system's DNS server as `0.0.0.0:53` and having Mihomo provide DNS proxying on that address. This lets Mihomo know the relationship between IP addresses and domain names in advance, which helps it apply routing rules. Otherwise, an app may request only an IP address, forcing Mihomo to make another DNS query to map it to a domain.

Mihomo DNS has two enhanced modes: `redir-host` and `fake-ip`. Different domains may sometimes share the same CDN IP, which can cause routing rules to match incorrectly. Mihomo's `fake-ip` mode addresses this issue. It also lets an app receive an immediate response to its DNS request without waiting for the upstream DNS lookup; Mihomo handles the subsequent traffic.

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
  nameserver-policy: # Resolve Beihang internal hostnames through the campus DNS server.
    "*.buaa.edu.cn": 202.112.128.51
```

== Configure Proxy Sources in Mihomo

=== Configure a Mihomo Proxy Provider

Mihomo core can directly reads a list of proxies (in yaml) or the subscription URL provided by
a service. No converter #footnote[like Sub-Store or #link("https://github.com/MetaCubeX/subconverter")[subconverter]] is needed to turn the URL into a YAML list of nodes in most cases.

Import the subscription URL into the Mihomo core as a `proxy-provider`. 
The configuration below requests an update from subscription service every day and checks the resulting 
nodes' connectivity using `gstatic` (connectivity with Google).

```yaml
proxy-providers:
  teacat:
    url: https%xxxxxxxx
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

URLs that can be used for node health checks:

- gstatic.com
- np.cloudflare.com
- openai/models/v1

== Configure Mihomo Proxy Groups
Proxy groups select the best available node to use for outbound traffic. The main types are:

- `url-test`: automatically test and select a node.
- `select`: let the user choose a node manually.
- `load-balance`: distribute requests across multiple nodes (with consistent hashing support).

Besides custom proxy groups, Mihomo provides several built-in groups:

- `PROXY`: direct connection.
- `REJECT`: reject the request.
- `REJECT-DROP`: reject without responding; silently drop the request.

```yaml
proxy-groups:
  - name: RABBIT
    type: url-test
    use: [rabbit]  # url-test does not probe nodes; it sorts the health-check results and selects one.
    interval: 300
    lazy: true     # Sort and select only when the group is used.
    tolerance: 50  # Avoid frequent switching; switch only when the improvement exceeds 50 ms.

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

I recommend testing nodes in `proxy-providers`. The Mihomo documentation makes clear that #strong[`url-test` in `proxy-groups` does not test nodes imported through `use: proxy-providers`.] A `proxy-groups` `url-test` should only use the latency results from the provider's health check to select the best node.

== Configure Mihomo Routing Rules
You may want to use different routing policies for different destinations. For example:

- Internal institutional domains such as `xxx.edu.cn` should connect directly, without a proxy.
- Local network addresses such as `192.168.xx.xxx` should connect directly.
- Websites in China, such as `baidu.com`, should connect directly.
- Traffic to `chatgpt.com` should go through a proxy node in the United States.
- Traffic to `google.com` should use a proxy node rather than connect directly.

Mihomo provides the following routing rule types for these needs:

#figure(
  align(center)[#table(
    columns: 3,
    align: (auto, auto, auto),
    table.header([Rule Type], [Description], [Example]),
    table.hline(),
    [`GEOIP`], [Match the country or region associated with the destination IP], [`GEOIP,CN,DIRECT`],
    [`GEOSITE`], [Match a Geosite domain category], [`GEOSITE,youtube,PROXY`],
    [`DOMAIN-SUFFIX`], [Match a domain and all its subdomains], [`DOMAIN-SUFFIX,google.com,PROXY`],
    [`DOMAIN-KEYWORD`], [Match domains containing a keyword], [`DOMAIN-KEYWORD,google,PROXY`],
    [`RULE-SET`], [Use a rule set provided by `rule-providers`], [`RULE-SET,direct,DIRECT`],
    [`IN-PORT`], [Match a Mihomo inbound port or port range], [`IN-PORT,7890,PROXY`],
    [`IN-TYPE`], [Match the Mihomo inbound type], [`IN-TYPE,SOCKS/HTTP,PROXY`],
    [`PROCESS-NAME`], [Match a process name exactly], [`PROCESS-NAME,chrome.exe,PROXY`],
    [`PROCESS-NAME-REGEX`], [Match a process name with a regular expression], [`PROCESS-NAME-REGEX,(?i)Telegram,PROXY`],
    [`IP-CIDR`], [Match an IPv4 or IPv6 CIDR range], [`IP-CIDR,192.168.0.0/16,DIRECT,no-resolve`],
    [`IP-SUFFIX`], [Match a specified IP address suffix range], [`IP-SUFFIX,8.8.8.8/24,PROXY`],
    [`MATCH`], [Match all remaining requests unconditionally, usually as the final fallback], [`MATCH,PROXY`],
  )],
  kind: table,
)

The routing rule format is `rule-type,domain,proxy-group`. It sends all traffic matching the specified scope and rule type through the selected proxy group. Rules are evaluated from top to bottom.

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

rules: # Format: rule type, scope, proxy group.
  - DOMAIN-SUFFIX,buaa.edu.cn,DIRECT
  - GEOIP,LAN,DIRECT
  - GEOSITE,apple,GLOBAL
  - GEOSITE,CN,DIRECT
  - RULE-SET,direct,DIRECT
  - MATCH,GLOBAL
```

== Overview

#figure(
  image("./mihomo-dashboard.webp", width: 80%),
)

=== Architecture Diagram

#raw(
  "flowchart TB\n  subgraph Provisioning[Proxy Provisioning]\n    Providers[Subscription Servers]\n    Subconverter[Subconverter]\n    Nodes[Proxy Providers]\n    Providers --> Subconverter\n    Subconverter -->|proxy-providers| Nodes\n  end\n  subgraph RuleProvisioning[Rule Provisioning]\n    RuleProviders[Remote Servers]\n    RuleProvider[Rule Providers]\n    RuleProviders -->|rule-providers| RuleProvider\n  end\n  subgraph Routing[Traffic Routing]\n    User[User Traffic]\n    Inbound[Mihomo Inbound: TUN / Mixed]\n    Metadata[Destination: Domain / IP / Process]\n    Rules[Routing Rules]\n    Groups[Proxy Groups]\n    SelectedNode[Selected Proxy Node]\n    Remote[Remote Proxy Server]\n    Destination[Destination Website]\n    Reject[Rejected]\n    DNS[DNS Resolver]\n    User --> Inbound\n    Inbound --> Metadata\n    Metadata --> Rules\n    Rules -->|PROXY| Groups\n    Groups --> SelectedNode\n    SelectedNode --> Remote\n    Remote --> Destination\n    Rules -->|DIRECT| Destination\n    Rules -->|REJECT| Reject\n    Inbound -.->|DNS queries| DNS\n    DNS -.->|Domain / IP result| Metadata\n  end\n  RuleProvider -.->|third-party rules| Rules\n  Nodes -.->|Available nodes| Groups",
  lang: "mermaid",
  block: true,
)

=== Example: Create a Dedicated Proxy Route for AI Websites
Suppose we have a node file at `./proxies/ai.yaml`. Import it into Mihomo, then filter out nodes in regions such as Hong Kong and Macao that are unreachable or unsuitable. Test each node against OpenAI's status endpoint and select a good one for accessing ChatGPT in a browser.

This helps avoid being blocked by AI services such as ChatGPT because of poor node quality.

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

== Other Configuration
=== Run as a Startup Service
On Windows, I recommend using WinSW to wrap `Mihomo.exe` as a service that starts automatically at boot.

+ Rename #link("https://github.com/winsw/winsw")[WinSW.exe] to `mihomo-sc.exe`.
+ Save the following configuration as `mihomo-sc.xml`.
+ Install and start the service as an administrator: `mihomo-sc.exe install && mihomo-sc.exe start`.

This example assumes the `mihomo.exe` core and its `config.yaml` are both in `D:\bin\mihomo`, so that path is used as the working directory. In a typical Windows setup, however, `mihomo.exe` should be placed in a directory on `PATH`, while `%LOCALAPPDATA%/mihomo` should be used as the working directory for runtime data.

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

Note that WinSW registers services under the LocalSystem account by default, not the current user.

=== Start with a Startup Script
If wrapping and managing a service with WinSW feels too complicated, use the Windows Startup folder instead:

+ Press Win + R and enter `shell:startup`.
+ Place the following VBScript in that folder.

```vbs
Set shell = CreateObject("WScript.Shell")
  shell.Run """D:\bin\mihomo.exe"" -d ""C:\Users\jay-waves\AppData\Local\mihomo""", 0, False
```

=== Set Up a Shared Proxy for the Local Network
If a local network has many servers and devices, configuring a Mihomo service on each one is cumbersome. Instead, run the Mihomo core on one machine as a proxy, then route traffic from the other machines through it over the local network.

The Mihomo configuration is simple:

```yaml
allow-lan: true
mixed-port: 7890
bind-address: "*"
```

Be careful about security. #strong[Binding to all addresses allows every machine on the local network to use yours as a proxy.] To limit access:

- Configure inbound and outbound firewall rules to allow inbound access to this port only from approved local addresses.
- Require a username and password (as below), then connect using `http://you:passwd@192.168.xx.xxx:7890`.

```yaml
authentication:
  - "you:passwd"
```

=== Configure the Local Dashboard
I recommend Mihomo's official #link("https://github.com/metacubex/metacubexd")[MetaCubeXD] dashboard, a frontend-only web app. It does not need to remain running in the background; the Mihomo core listens on the configured port and serves it when needed. The port can be exposed to other devices, but take care to secure it.

Extract the packaged MetaCubeXD files to a directory such as `E:/metacubexd-ui`. Expose the dashboard on port `9090`, then open `http://127.0.0.1:9090` in a local browser.

```yaml
external-controller: 127.0.0.1:9090
external-ui:  "E:/metacubexd-ui"
```

=== Tuning (TODO)
TUN mode operates at the #link("https://github.com/jay-waves/til/network-l3/IPv4.md")[network layer], handling IP and higher-layer protocols.

TAP mode operates at the #link("https://github.com/jay-waves/til/data-link-l2.md")[data-link layer], handling Ethernet frames and emulating a physical network adapter, for example for virtual-machine networking and bridging.

TUN mode creates a virtual network adapter (such as `utun0`) and intercepts and redirects system traffic at the network layer.

Some important characteristics:

+ All traffic (TCP, UDP, ICMP, and DNS) is intercepted and processed by the proxy's routing rules.
+ Some apps, such as system updates and background services, ignore the system proxy. TUN can take over this traffic, providing more precise control.
+ #strong[TUN mode may override hosts-file behavior and firewall rules because it takes control of traffic at the network layer.]

```yaml
tun:
  enable: false
  stack: system
  auto-route: true
  auto-detect-interface: true
  dns-hijack:
    - any:53

# Reduce performance overhead.
ipv6: false
tcp-concurrent: false # Resolve multiple IP addresses and try them in parallel.
keep-alive-interval: 15
```

== Troubleshooting
=== DNS over HTTPS
Do not configure Mihomo DNS to rely on a `DoH` service alone. For example, accessing `https://dns.google.com/dns-query` first requires a DNS lookup. If that lookup fails because the network is unreachable, DNS resolution for all network access may fail.

At least one fallback UDP DNS server is needed. In my configuration, however, this did not work very reliably.

=== UWP Apps
UWP apps include Microsoft Store and apps installed through it, such as Apple Music and Microsoft Photos. They run in a sandbox and cannot access the local loopback interface by default, which prevents them from using the Mihomo proxy. Grant the required permission as follows:

```powershell
sudo checknetisolation loopbackexempt -s

CheckNetIsolation LoopbackExempt -a -n="AppleInc.AppleMusicWin_nzyj5cx40ttqa"
```

=== Considerations for Proxy Use at Work
Corporate firewalls may collect statistics on DNS and IP traffic to monitor employees' network activity.

Some companies install an enterprise root CA on employee computers. This allows the company gateway to issue certificates trusted by those devices and perform a man-in-the-middle (MITM) inspection. The company can decrypt and inspect employees' HTTPS traffic before forwarding it to external sites.

When browsing on a company computer, check the issuer of the site's certificate to see whether it is a recognized certificate authority or a company-managed CA.

=== Providers Disappearing
#strong[Proxy providers have been disappearing frequently lately, so avoid long-term subscriptions. See the #link("https://github.com/limbopro/Paolujichang/issues")[provider shutdown tracker] for details.]
