# 多路伺服电机的通信架构与实时控制

本文主要介绍如何实时控制多路电机，主要关注软件与网络设计权衡，包含如下内容：
* 网络拓扑设计
* 设备控制与状态接口设计
* 网络通信的实时性优化
* 少量控制算法相关

目前该文档只是对代码的文档式总结，尚未完成。

## 最小控制接口

公共控制接口不暴露网关、CAN 总线和协议帧。上层控制器只提交目标量；runtime 根据初始化时建立的绑定关系完成逻辑设备到物理电机的映射。

电机协议对上层暴露的最小控制面由三类命令组成：位置、速度和力矩。三者均以 `device_id_t` 标识逻辑设备；运行时再将逻辑设备映射到具体 channel、CAN port 和 CAN id。

```cpp
struct position_command {
    device_id_t device_id;
    float position_deg;
    float velocity_limit_rpm;
    float current_limit;
    reply_mode reply = reply_mode::status1;
};

struct velocity_command {
    device_id_t device_id;
    float velocity_rpm;
    float current_limit;
    reply_mode reply = reply_mode::status1;
};

struct torque_command {
    device_id_t device_id;
    float torque_nm;
    reply_mode reply = reply_mode::status1;
};
```

其中 `position_deg` 为位置参考，单位 degree；`velocity_rpm` 为速度参考，单位 rpm；`torque_nm` 为力矩参考，单位 N·m。位置和速度命令携带限幅参数，作为主控侧给定量进入电机侧控制器前的约束。

### 状态采样

反馈接口采用缓存采样模型。状态接口不主动查询设备，只返回驱动最近一次解析并应用的采样值。

```cpp
template <typename T> struct sample_t {
    time_point time{};
    uint64_t seq = 0;
    T value{};
};
```

`sample_t` 表示一次已缓存的设备状态采样。`seq != 0` 表示该字段至少更新过一次；`time` 是驱动接收并应用该字段的时间戳。控制循环必须根据 `fresh(now, max_age)` 判断数据是否过期。

该模型保留两个必要信息。首先，`seq == 0` 区分“未收到过采样”和“采样值为零”。其次，新鲜度阈值不在驱动层固定。运动反馈、温度、电机版本和 UUID 的有效期不同，过期策略应由控制器按字段和任务定义。

最小反馈接口为：

```cpp
class motor_interface : public fleet::device_interface {
public:
    virtual sample_t<motor_err> motor_error() const = 0;
    virtual sample_t<float> position_deg() const = 0;
    virtual sample_t<float> velocity_rpm() const = 0;
    virtual sample_t<float> current() const = 0;
};
```

### 电机控制的典型三环结构

我们默认采用“电机 MCU 内闭环、主控侧轨迹/命令生成”的分层结构：

1. 电流环：位于电机 MCU 内部，通常为最高频内环。
2. 速度环：位于电机 MCU 内部，接受速度目标或 PVT 速度分量。
3. 位置环：位于电机 MCU 内部，接受位置目标或 PVT 位置分量。

主控侧不直接实现电机三环控制器，而是周期性发送位置、速度、力矩或 PVT 参考量，并异步接收反馈。电流内环不适合跨越 UDP、CAN、操作系统调度和用户态控制循环实现；主控侧应承担轨迹生成、约束管理和外环监督。

因此，主控侧控制周期必须显著慢于电机内环。反馈新鲜度是控制律输入有效性的一部分，必须由上层控制器显式检查。

### 控制循环

推荐的控制层级如下：

| 控制周期 | 频率 | 位置 |
| --- | --- | --- |
| 电机三环驱动 | 1 kHz 或更高 | 电机 MCU 内 |
| PVT 控制、单关节控制 | 500 Hz | 主控控制驱动 |
| 目标规划 | 10 Hz | 上层规划器 |

在主控侧，控制循环应满足：

1. 每周期只读取 `sample_t` 快照，不在设备锁内执行控制计算。
2. 使用 `fresh(now, max_age)` 严格判断反馈有效性。
3. 周期落后时优先丢弃旧控制命令，而不是补发过期命令。
4. 批量发送同类型命令，以获得 UDP 聚合收益。
5. 将配置查询和周期控制分离，避免慢速配置请求污染高频控制队列。

一个典型 500 Hz 主控循环可以组织为：

```text
loop every 2 ms:
    now = steady_clock::now()
    read sample_t snapshots
    reject stale feedback
    compute latest targets
    optionally discard old pending commands if loop is late
    command(span<const pvt_command>)
```

该循环模型中，控制器读取状态快照并提交最新参考量，中间不同步等待设备回复。稳定性评估应关注尾延迟、反馈过期和旧包积压，而非仅观察平均延迟。


## 架构设计（对象模型）

### 网络拓扑

目标拓扑为 32 个电机、2 个 MCU 网关、4 条 CAN 总线：

```text
主控
  |
  +-- UDP channel 0 -> MCU gateway 0
  |       +-- CAN0 -> 8 motors
  |       +-- CAN1 -> 8 motors
  |
  +-- UDP channel 1 -> MCU gateway 1
          +-- CAN0 -> 8 motors
          +-- CAN1 -> 8 motors
```

在 `fleet_config` 中，一个 `channel_config` 对应一个 UDP 网关连接；一个 `motor_config` 对应一个逻辑电机。电机配置包含：

```cpp
name, channel, model, can_port, can_id
```

拓扑复杂性在初始化阶段收敛。控制循环不依赖网关编号、CAN 总线编号或 CAN ID；它只持有 `device_id` 或 `motor_interface` 指针。配置错误在 `init()` 阶段暴露，避免在周期控制路径中形成运行时路由不确定性。

### 设备接口与驱动设计

```text
                   command
  user/controller ---------> runtime ---------> motor_driver ---------> channel
        |                                      |
        | read feedback                        | apply feedback
        v                                      v
  motor_interface ----------------------> motor_device
```

`runtime` 负责生命周期、配置校验和命令分发。`motor_driver` 负责 ENCOS CAN-over-UDP 协议编码、发送、接收、路由和反馈解析。`motor_device` 持有设备状态缓存。`motor_interface` 是对外只读接口，避免上层直接接触驱动内部状态。

`motor_device` 是状态拥有者，`motor_interface` 是外部观察者。上层代码通过接口读取状态；状态写入只允许从 driver 接收路径进入。该约束使设备状态的写入来源唯一化，有利于审查反馈路径和并发语义。

逻辑设备 ID 是 `runtime` 初始化时按 `motors` 配置顺序分配的连续整数。发送命令时，运行时先用 `device_id` 查到 `(driver_slot, device_slot)`，再由对应 driver 将命令编码为 CAN 帧。

接收路径采用反向路由表：

```text
motor_routes_[can_port][can_id] -> motor_device
```

反馈帧到达后可按 CAN port 和 CAN id 直接定位设备，不需要线性扫描全部电机。对 32 电机拓扑而言，该路径主要降低接收线程尾延迟，并使路由成本与设备总数解耦。

### 线程与对象模型

实时 UDP 通道使用两个后台线程：

```text
TX thread: pending queue -> token bucket -> UDP send
RX thread: UDP receive -> callback -> driver decode -> device apply
```

TX 线程负责发送队列消费、带宽限流和 UDP 发送重试。RX 线程负责非阻塞接收，并在接收线程内调用 driver 回调。普通 `udp_channel` 还有一个单线程实现，但电机驱动使用的是 `realtime_udp_channel`。

TX/RX 分线程用于隔离发送背压与接收处理。发送侧可能因 token bucket 等待或 socket busy 退避；这些阻塞不应传播到反馈接收路径。接收侧保持短路径处理：收包、过滤来源、解码、路由、写入设备状态。

全局运行时对象使用：

```cpp
std::atomic<std::shared_ptr<runtime_t>>
```

`init()` 以 release store 发布新运行时；`command()` 与 `lookup()` 以 acquire load 读取当前运行时。这样可以避免全局互斥锁，并使 shutdown 通过替换 shared_ptr 完成生命周期切换。

设备状态内部使用一个 `std::mutex` 保护多个 `sample_t` 字段。读状态时只复制一个 sample；写反馈时在解析完成后一次性进入临界区并更新相关字段。锁的范围限定在设备状态本身，不覆盖 UDP 接收、协议解析或用户控制循环。

当前实现未采用无锁状态缓存。对 32 电机、500 Hz 主控循环的目标而言，设备级 mutex 已经足够。

## 实时性优化

### 报文聚合与批处理

ENCOS 网关协议为 CAN-over-UDP。一个 UDP 包可以携带多个 CAN 帧：

```text
+------+-------+----------+-------------------------+----------+------+
| STX  | TYPE  | LENGTH   | PAYLOAD                 | CHECKSUM | ETX  |
| 0xAA | 1 B   | 2 B BE   | MSG_CNT + CAN messages  | 2 B LE   | 0xBB |
+------+-------+----------+-------------------------+----------+------+
```

每个 CAN entry 固定 14 字节：

`LENGTH = 1 + MSG_CNT * 14`。CRC 为 CRC16-CCITT，覆盖 `TYPE + LENGTH + PAYLOAD`，即从包的第 1 字节开始计算。

报文聚合针对的是系统调用次数、网关处理次数和 UDP datagram 数量，而非单个字段编码开销。同一 driver 的多条 CAN 命令合并为一个 UDP 包后，32 电机的一次周期控制可压缩为少量 UDP datagram。对高频控制路径而言，该优化直接作用于尾延迟和链路占用。

批处理入口为：

```cpp
template <Command T>
std::error_code command(std::span<const T> cmds);
```

运行时将同一批命令按 driver 分组。每个 driver 内部使用固定数组暂存 CAN 帧，满 `MAX_FRAMES_PER_PACKET` 后立即 flush；批处理结束后 flush 剩余帧。该策略减少 UDP 包数量，同时保留每个电机命令的原始 CAN 语义。

批处理入口位于公共 API 层。上层控制器生成同周期目标后直接提交 `span`；runtime 根据拓扑绑定自动按 driver 分桶。该结构避免控制代码手工按网关拆分命令，并保证批处理语义在 driver 层实际转化为 UDP 报文聚合。

批处理语义是 best-effort：一批命令中某些命令可能已经编码、入队或发送；如果后续命令失败，已发生的副作用不会回滚。返回的 `error_code` 只表示批处理中出现过错误，不表示某个具体设备已经执行或拒绝执行。该语义符合周期控制的时效性要求。控制循环关注下一周期参考量的及时提交，而不是对历史参考量逐帧确认。需要可靠确认的配置命令应采用单独策略，不应占用高频控制队列的可靠性预算。


### 报文发送路径

发送路径如下：

```text
command(span<T>)
  -> runtime_t::send_motor_commands
  -> motor_driver::batch_commands<T>
  -> can_codec::encode
  -> motor_driver::send(span<can_frame>)
  -> realtime_udp_channel::prepare_send
  -> motor_codec::encode_into
  -> realtime_udp_channel::commit_send
  -> TX thread
  -> UDP socket
```

`prepare_send()` 从 packet pool 中申请一个固定槽位；`encode_into()` 直接写入该槽位；`commit_send()` 只提交槽号和有效长度。因此 driver 发送路径避免了“先编码到临时 vector，再复制到发送队列”的额外拷贝。

该路径的关键在于改变编码目标，而非增加额外抽象。协议编码直接写入发送槽位后，发送队列中的 pending item 只需保存“槽号 + 有效长度”。该结构减少一次内存拷贝和一次临时缓冲分配，并降低发送路径中的动态内存行为。

### 控制命令与配置命令的分流

当前公共命令分为三类：

1. 流式控制命令：`pvt_command`、`position_command`、`velocity_command`、`torque_command`、`current_command`、`brake_command`。
2. 设备配置命令：`config_set_command`、`config_query_command`。
3. 运行时命令：`net_control_command`、`discard_pending_command`。

流式控制命令是周期性命令。若上层发现控制周期落后，应优先使用 `discard_pending_command` 丢弃尚未发送的旧包，再发送最新控制量。库本身提供丢弃队列接口，但不会自动判断某条控制命令是否过期。

对控制命令而言，参考量具有时效性。网络短时拥塞后补发过期位置或速度目标会把通信延迟转化为控制误差；因此旧控制包应允许由上层按周期语义丢弃。

> 重复的电机配置命令应该给予覆盖和聚合，可能需要独立的配置报文队列

### 限流器与过载策略

通道配置包含：

```cpp
size_t max_bandwidth_bps = 1'000'000;
uint32_t send_queue_slots = 1024;
```

发送限流器为 token bucket。桶容量为 `2 * MOTOR_UDP_PACKET_CAP`，当前 `MOTOR_UDP_PACKET_CAP = 512`，因此允许约 1024 字节的短时突发；随后按 `max_bandwidth_bps / 8` 的字节速率补充令牌。

该限流器用于背压保护，而非精确周期调度。它允许小规模突发通过，并在持续超带宽时拉长发送间隔。该行为限制网关和 socket buffer 压力，同时通过延迟或 `busy` 将过载状态暴露给上层。

过载策略为：

1. packet pool 无空闲槽位时，`prepare_send()` 返回 `fleet_err::busy`。
2. pending queue 满时，提交失败并释放槽位。
3. UDP socket 短时 busy 时，TX 线程最多重试 3 次，初始 backoff 为 100 ms，并指数退避。
4. `discard_pending_sends()` 可丢弃尚未发送的 pending 包。

严格周期控制由上层控制循环负责，库只限制最大带宽并约束发送路径抖动。控制器一旦观察到周期落后，应主动降频、丢弃旧包或进入安全策略，而不应依赖通道无限排队。

### 报文接收路径

接收路径如下：

```text
RX thread
  -> socket.receive_from
  -> receive_callback(bytes_view)
  -> motor_driver::handle_packet
  -> motor_codec::decode_each
  -> motor_driver::handle_frame
  -> can_codec::parse_feedback
  -> motor_device::apply
```

接收回调参数为 `bytes_view`，指向 RX 线程内部接收缓冲区，仅在 callback 返回前有效。driver 在回调内同步完成解码和状态应用，不保存该 view。这样可以避免接收路径上的额外堆分配。

反馈路由不扫描设备列表，而是通过 `motor_routes_[port][can_id]` 定位目标设备。未知端口、未知 CAN ID 或广播帧不会更新设备状态。

### 内存池优化

发送路径使用固定 packet pool：

```text
send_storage = packet_cap * send_queue_slots
free_slots   = fixed_ring_queue<uint32_t>
pending      = fixed_ring_queue<uint32_t>
```

`packet_buffer` 是一个 RAII 句柄。未 commit 的 buffer 析构时会自动释放槽位；commit 后由 TX 线程发送并释放槽位。该设计将发送路径的内存分配移动到通道初始化阶段，降低运行期分配造成的延迟抖动。

固定槽位将主要动态分配从运行期移至初始化期。队列满时立即返回 `fleet_err::busy`，而不是继续扩容。对控制系统而言，可预期失败优于不可预期延迟。

接收路径使用线程栈上的固定 `std::array<uint8_t, MAX_UDP_SIZE>` 作为接收缓冲区，并用 `bytes_view` 向上层传递只读视图。


### 零拷贝接口 (TODO: 合并到之前的收发路径里）

实时通道提供两种发送接口：

```cpp
err_code send(bytes_view data);
result<packet_buffer> prepare_send();
err_code commit_send(packet_buffer&& packet, uint32_t size);
```

`send(bytes_view)` 会将用户数据复制到 packet pool。`prepare_send()/commit_send()` 允许调用者直接写入发送槽位。电机驱动采用后者，协议编码直接落在发送槽位中，从而减少拷贝并缩短发送临界路径。

接口保留两条路径：一般调用者可使用 `send(bytes_view)`；性能敏感的 driver 使用槽位接口。该分层避免将 packet pool 细节暴露给所有调用者，同时为关键路径提供直接编码到发送缓冲区的能力。

该零拷贝范围仅覆盖主机内存路径；UDP socket 发送仍由操作系统网络栈处理，不能视为端到端零拷贝。


## 实机测试与系统优化

以下关于 Linux 的建议不属于库 API，但会影响实际控制效果。在 RK3588 这类异构平台上，线程迁移和 IRQ 抖动可能超过协议编码本身的影响。因此，性能评估应区分本地 codec、UDP loopback 和真实网关链路。

测试平台： 
* CPU: RK3588, 4 * Cortex-A76 2.4GHz + 4 * Cortex-A55 1.8GHz, 64KiB Cache Line
* OS: GNU/linux ok3588 5.0.209-rt89, SMP, PREEMPT_RT 
* Mem: 8GB 2112MHz
* Network: st_gmac + realtek r8168

UDP 转 CAN 的链路，主要走 st_gmac 这个链路，和底层 MCU 通信，MCU 内控制 CAN 链路。PCIe 网卡总吞吐量更好，但是有一些操作（如 DMA）有额外延迟，不适合实时控制。

### Linux 实时性补丁

内核 已经开启 PREEMPT_RT ，我们只需要获得启动实时线程的权限，调整频率策略，以及配置 `SCHED_FIFO` 。相关代码实现放在一个独立的分支 [rt-linux](https://github.com/jay-waves/servo-fleet/tree/rt-linux) 上

这需要用 linux 和 pthread api 对源码进行修改，显然会损害跨平台性，悲~~

### Linux 核心绑定

理想的核心职责划分：
* CPU 2: 网卡 (st_gmac) IRQ/SoftIRQ 绑在一个小核心上。注意不要绑在默认的 CPU0~1 上，其系统任务多，抖动比较重。
* CPU 3: 本程序的 UDP RX/TX Threads。绑定在一个小核上。实际上，这个交给系统来调度也没问题。
* CPU 7: 本程序的控制循环，只读取设备状态并提交最新命令。控制算法线程绑定在大核上，并且进行核隔离。

CPU2 唯一写设备状态，CPU7唯一读设备状态和发令。因此不会频繁争抢 mutex，状态缓冲区填充到缓存行。

由于 udp rx/tx threads 可能比较多，负载也没有很重。在我的实现中，我只做了这两个处理：
* 把 st_gmac irq 从 CPU0 迁出，绑定在 CPU2
* 让控制线程独占 CPU7 ，收发包线程（ASIO 线程）交给操作系统调度。（网络线程弱调度，控制线程强绑定）

主要工程问题是跨核缓存失效。当前设备状态由 mutex 保护；RX 线程写入 sample，控制线程读取 sample。该模式保持语义正确，但会引入 cache line 迁移。降低该开销的方向包括：

1. 将高频字段按设备或按字段组拆分，减少无关字段共享同一 cache line。
2. 控制线程批量读取一组设备状态，减少锁获取次数。
3. RX 线程只做状态写入，不在 callback 中执行重计算。
4. 对确认为高频只读的字段，可进一步演进为双缓冲或 sequence lock。
5. 无锁结构应以实测瓶颈为前提；当前 mutex 方案保持较低实现复杂度和明确并发语义。

当前实现优先保证并发边界清晰：接收线程拥有设备状态写入权，控制线程只读取快照；跨核缓存成本通过缩小锁范围和减少共享写入控制。


### CAN 协议吞吐量测试

仓库包含两个相关测试：

1. 本地编解码延迟测试：满包 `MAX_FRAMES_PER_PACKET` 的 CAN 帧循环编码和解码 20000 次。测试要求 encode/decode mean 和 p99 均不超过 100 us，且本地 round trip 不低于 10000 次/s。
2. 背压测试：瞬时提交 24 个 128 B UDP 包，目标带宽为 102.4 kbps。测试要求实际带宽为目标的 80% 到 115%，限流后的平均包间隔为 8 到 12 ms，p99 包间隔不超过 50 ms，最大排队延迟在 120 到 500 ms。

README 中给出的工程估算为：单 UDP 携带 32 个 CAN 帧，400 Hz 时带宽约 1.46 Mbps。因此 30 个左右电机在 1.5 Mbps 控制带宽下几乎没有余量。

该带宽估算约束了协议设计空间。链路接近预算时，可靠重试、逐帧确认和额外诊断包都会反映到尾延迟上。性能测试的作用是提供回归边界：后续改动必须同时观察平均吞吐和尾延迟，而非只比较单次编码成本。


