#import "@local/ypst-template:0.1.0" as theme 

#import theme: template, sidenote, theorem, sidenote

#show: template

= Communication Architecture and Real-Time Control for Multi-Channel Servo Motors

This article describes how to control multiple motors in real time, focusing on software and network design trade-offs. It covers:

- Network topology
- Device control and state interfaces
- Real-time network communication optimizations
- A few aspects of control algorithms

This document is currently an incomplete, code-oriented summary of the implementation.

== Minimal Control Interface
The public control interface does not expose gateways, CAN buses, or protocol frames. Higher-level controllers submit targets only; the runtime maps logical devices to physical motors using the bindings established during initialization.

The motor protocol exposes a minimal control surface to higher layers through three commands: position, velocity, and torque. Each uses `device_id_t` to identify a logical device; at runtime, the logical device is mapped to a specific channel, CAN port, and CAN ID.

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

Here, `position_deg` is the position reference in degrees, `velocity_rpm` is the velocity reference in rpm, and `torque_nm` is the torque reference in N·m. Position and velocity commands carry limit parameters that constrain setpoints from the host before they reach the motor controller.

=== State Sampling
The feedback interface uses a cached-sample model. The state interface does not actively query devices; it returns the latest sample parsed and applied by the driver.

```cpp
template <typename T> struct sample_t {
    time_point time{};
    uint64_t seq = 0;
    T value{};
};
```

`sample_t` represents a cached device-state sample. `seq != 0` means the field has been updated at least once; `time` is the timestamp when the driver received and applied the field. The control loop must use `fresh(now, max_age)` to determine whether the data is stale.

This model preserves two essential pieces of information. First, `seq == 0` distinguishes “no sample received” from “the sample value is zero.” Second, the freshness threshold is not fixed in the driver. Motion feedback, temperature, motor version, and UUID have different validity periods, so the controller should define staleness policies by field and task.

The minimal feedback interface is:

```cpp
class motor_interface : public fleet::device_interface {
public:
    virtual sample_t<motor_err> motor_error() const = 0;
    virtual sample_t<float> position_deg() const = 0;
    virtual sample_t<float> velocity_rpm() const = 0;
    virtual sample_t<float> current() const = 0;
};
```

=== Typical Three-Loop Motor Control
We assume a layered design in which the motor MCU closes the control loops while the host generates trajectories and commands:

+ Current loop: runs on the motor MCU and is usually the highest-frequency inner loop.
+ Velocity loop: runs on the motor MCU and accepts a velocity target or the velocity component of a PVT command.
+ Position loop: runs on the motor MCU and accepts a position target or the position component of a PVT command.

The host does not implement the motor's three control loops directly. Instead, it periodically sends position, velocity, torque, or PVT references and receives feedback asynchronously. The current loop should not span UDP, CAN, operating-system scheduling, and a user-space control loop; the host should handle trajectory generation, constraint management, and outer-loop supervision.

The host control period must therefore be significantly slower than the motor's inner loops. Feedback freshness is part of input validity for the control law and must be checked explicitly by the higher-level controller.

=== Control Loop
The recommended control hierarchy is:

#figure(
  align(center)[#table(
    columns: 3,
    align: (auto,auto,auto,),
    table.header([Control Period], [Frequency], [Location],),
    table.hline(),
    [Motor control loops], [1 kHz or higher], [On motor MCU],
    [PVT and single-joint control], [500 Hz], [Host controller],
    [Target planning], [10 Hz], [High-level planner],
  )]
  , kind: table
  )

On the host, the control loop should:

+ Read only `sample_t` snapshots each cycle; do not run control calculations while holding a device lock.
+ Use `fresh(now, max_age)` to check feedback validity strictly.
+ If the loop falls behind, discard stale control commands instead of sending them late.
+ Batch commands of the same type to benefit from UDP aggregation.
+ Separate configuration queries from periodic control so slow requests do not interfere with the high-frequency control queue.

A typical 500 Hz host loop can be structured as follows:

```text
loop every 2 ms:
    now = steady_clock::now()
    read sample_t snapshots
    reject stale feedback
    compute latest targets
    optionally discard old pending commands if loop is late
    command(span<const pvt_command>)
```

In this loop, the controller reads state snapshots and submits the latest references without waiting synchronously for device responses. Stability evaluations should focus on tail latency, stale feedback, and backlogs of old packets—not just average latency.

== Architecture (Object Model)
=== Network Topology
The target topology has 32 motors, two MCU gateways, and four CAN buses:

```mermaid
flowchart TD
    H["Host Controller"]

    H -->|UDP Channel 0| G0["MCU Gateway 0"]
    H -->|UDP Channel 1| G1["MCU Gateway 1"]

    G0 --> C00["CAN0"]
    G0 --> C01["CAN1"]
    G1 --> C10["CAN0"]
    G1 --> C11["CAN1"]

    C00 --> M00["8 Motors"]
    C01 --> M01["8 Motors"]
    C10 --> M10["8 Motors"]
    C11 --> M11["8 Motors"]
```

In `fleet_config`, each `channel_config` represents a UDP gateway connection, and each `motor_config` represents a logical motor. A motor configuration contains:

```cpp
name, channel, model, can_port, can_id
```

Topology complexity is resolved during initialization. The control loop does not depend on gateway numbers, CAN bus numbers, or CAN IDs; it holds only a `device_id` or a `motor_interface` pointer. Configuration errors surface during `init()`, avoiding runtime routing uncertainty in the periodic control path.

=== Device Interface and Driver Design

```mermaid
flowchart LR
    U["User / Controller"]
    R["Runtime"]
    D["Motor Driver"]
    C["Channel"]
    I["Motor Interface"]
    M["Motor Device"]

    U -->|Command| R
    R --> D
    D --> C

    U -->|Read Feedback| I
    D -->|Apply Feedback| M
    I --> M
```

`runtime` handles lifecycle management, configuration validation, and command dispatch. `motor_driver` handles ENCOS CAN-over-UDP protocol encoding, transmission, reception, routing, and feedback parsing. `motor_device` owns the device-state cache. `motor_interface` is a read-only public interface that keeps higher layers away from driver internals.

`motor_device` owns the state, while `motor_interface` observes it. Higher-level code reads state through the interface; state can only be written through the driver's receive path. This gives device state a single write path, making feedback flow and concurrency semantics easier to review.

Logical device IDs are consecutive integers assigned at runtime initialization in the order of the `motors` configuration. When sending a command, the runtime uses `device_id` to find `(driver_slot, device_slot)`, then the corresponding driver encodes the command as a CAN frame.

The receive path uses a reverse routing table:

```text
motor_routes_[can_port][can_id] -> motor_device
```

When a feedback frame arrives, its CAN port and CAN ID identify the device directly, without a linear scan of all motors. For a 32-motor topology, this primarily reduces receive-thread tail latency and decouples routing cost from the number of devices.

=== Thread and Object Model
The real-time UDP channel uses two background threads:

```text
TX thread: pending queue -> token bucket -> UDP send
RX thread: UDP receive -> callback -> driver decode -> device apply
```

The TX thread consumes the send queue, enforces bandwidth limits, and retries UDP sends. The RX thread performs non-blocking receives and invokes the driver callback on the receive thread. A regular single-threaded `udp_channel` implementation also exists, but the motor driver uses `realtime_udp_channel`.

Separating TX and RX isolates send-side backpressure from receive processing. The sender may wait for a token bucket or back off when the socket is busy; these delays should not propagate to the feedback receive path. Receive processing stays short: receive the packet, filter its source, decode and route it, then update device state.

The global runtime object uses:

```cpp
std::atomic<std::shared_ptr<runtime_t>>
```

`init()` publishes a new runtime with a release store; `command()` and `lookup()` read the current runtime with acquire loads. This avoids a global mutex and lets shutdown switch lifetimes by replacing the shared\_ptr.

Device state uses one `std::mutex` to protect multiple `sample_t` fields. Reading state copies only one sample. When writing feedback, parsing finishes first, then the code enters the critical section once to update the relevant fields. The lock protects device state only; it does not cover UDP reception, protocol parsing, or the user control loop.

The current implementation does not use a lock-free state cache. A per-device mutex is sufficient for the target of 32 motors and a 500 Hz host control loop.

== Real-Time Optimizations
=== Packet Aggregation and Batching
The ENCOS gateway protocol carries CAN over UDP. A single UDP packet can contain multiple CAN frames:

```text
+------+-------+----------+-------------------------+----------+------+
| STX  | TYPE  | LENGTH   | PAYLOAD                 | CHECKSUM | ETX  |
| 0xAA | 1 B   | 2 B BE   | MSG_CNT + CAN messages  | 2 B LE   | 0xBB |
+------+-------+----------+-------------------------+----------+------+
```

Each CAN entry is a fixed 14 bytes:

`LENGTH = 1 + MSG_CNT * 14`. The CRC is CRC16-CCITT and covers `TYPE + LENGTH + PAYLOAD`, starting at byte 1 of the packet.

Packet aggregation reduces the number of system calls, gateway operations, and UDP datagrams—not the cost of encoding individual fields. Combining multiple CAN commands from the same driver into one UDP packet reduces a single control cycle for 32 motors to a small number of datagrams. In a high-frequency control path, this directly affects tail latency and link utilization.

The batch entry point is:

```cpp
template <Command T>
std::error_code command(std::span<const T> cmds);
```

The runtime groups each batch of commands by driver. Each driver stages CAN frames in a fixed-size array and flushes it as soon as it reaches `MAX_FRAMES_PER_PACKET`; any remaining frames are flushed at the end of the batch. This reduces the number of UDP packets while preserving the original CAN semantics of each motor command.

The batch entry point is part of the public API. After generating targets for a control cycle, the higher-level controller submits a `span`; the runtime automatically groups commands by driver according to the topology bindings. This avoids manually splitting commands by gateway in control code and ensures the driver turns batching into actual UDP packet aggregation.

Batching is best-effort: some commands in a batch may already have been encoded, queued, or sent when a later command fails, and those side effects are not rolled back. The returned `error_code` indicates only that an error occurred somewhere in the batch; it does not say whether a specific device executed or rejected its command. This semantics fits the time-sensitive nature of periodic control. The control loop needs to submit the next cycle's references on time, rather than acknowledge every historical reference frame by frame. Configuration commands that require reliable confirmation should use a separate strategy and should not consume the reliability budget of the high-frequency control queue.

=== Packet Transmission Path
The send path is:

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

`prepare_send()` acquires a fixed slot from the packet pool; `encode_into()` writes directly into that slot; `commit_send()` submits only the slot index and payload length. This avoids an extra copy in the driver send path—encoding into a temporary vector and then copying it into the send queue.

The key is to change the encoding destination, not to add another abstraction. Once protocol data is encoded directly into a send slot, each pending item in the send queue needs to store only a slot index and payload length. This removes one memory copy and one temporary buffer allocation, reducing dynamic memory activity in the send path.

=== Separating Control and Configuration Commands
The current public commands fall into three categories:

+ Streaming control commands: `pvt_command`, `position_command`, `velocity_command`, `torque_command`, `current_command`, and `brake_command`.
+ Device configuration commands: `config_set_command` and `config_query_command`.
+ Runtime commands: `net_control_command` and `discard_pending_command`.

Streaming control commands are periodic. If the higher-level controller detects that a cycle is late, it should use `discard_pending_command` to discard old packets that have not yet been sent before submitting the latest controls. The library provides an interface to discard queued packets, but does not automatically determine whether a control command has expired.

Control references are time-sensitive. Sending a stale position or velocity target after a brief network congestion turns communication delay into control error. The higher-level controller should therefore be able to discard old control packets according to cycle semantics.

#quote(block: true)[
Repeated motor configuration commands should be coalesced and aggregated; they may need a separate configuration packet queue.
]

=== Rate Limiting and Overload Policy
Channel configuration includes:

```cpp
size_t max_bandwidth_bps = 1'000'000;
uint32_t send_queue_slots = 1024;
```

The send-side rate limiter is a token bucket. Its capacity is `2 * MOTOR_UDP_PACKET_CAP`. With `MOTOR_UDP_PACKET_CAP = 512`, it allows a short burst of about 1,024 bytes, then replenishes tokens at `max_bandwidth_bps / 8` bytes per second.

This limiter provides backpressure protection, not precise periodic scheduling. It allows small bursts and lengthens the interval between sends when traffic continuously exceeds the bandwidth limit. This limits pressure on the gateway and socket buffer while exposing overload to higher layers through delays or a `busy` result.

The overload policy is:

+ If no packet-pool slots are free, `prepare_send()` returns `fleet_err::busy`.
+ If the pending queue is full, submission fails and releases the slot.
+ If the UDP socket is briefly busy, the TX thread retries up to three times, starting with a 100 ms backoff and increasing it exponentially.
+ `discard_pending_sends()` discards pending packets that have not yet been sent.

Strict periodic control is the responsibility of the higher-level control loop. The library limits the maximum bandwidth and bounds jitter in the send path. When the controller detects a missed cycle, it should lower the rate, discard stale packets, or enter a safe state rather than relying on the channel to queue packets indefinitely.

=== Packet Reception Path
The receive path is:

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

The receive callback takes a `bytes_view` pointing to a buffer owned by the RX thread. It is valid only until the callback returns. The driver decodes the packet and applies the state synchronously within the callback, without retaining the view. This avoids extra heap allocations on the receive path.

Feedback routing does not scan the device list. It uses `motor_routes_[port][can_id]` to locate the target device. Frames with an unknown port, unknown CAN ID, or broadcast address do not update device state.

=== Memory Pool Optimization
The send path uses a fixed packet pool:

```text
send_storage = packet_cap * send_queue_slots
free_slots   = fixed_ring_queue<uint32_t>
pending      = fixed_ring_queue<uint32_t>
```

`packet_buffer` is an RAII handle. If a buffer is destroyed before commit, its slot is released automatically. After commit, the TX thread sends the packet and releases the slot. This moves send-path allocations to channel initialization and reduces latency jitter caused by allocations at runtime.

Fixed slots move most dynamic allocation from runtime to initialization. When the queue is full, the system immediately returns `fleet_err::busy` instead of growing it. For a control system, a predictable failure is better than unpredictable latency.

The receive path uses a fixed `std::array<uint8_t, MAX_UDP_SIZE>` on the thread stack as its receive buffer and passes a read-only view to higher layers through `bytes_view`.

=== Zero-Copy Interface (TODO: merge into the send and receive sections above)
The real-time channel provides two send interfaces:

```cpp
err_code send(bytes_view data);
result<packet_buffer> prepare_send();
err_code commit_send(packet_buffer&& packet, uint32_t size);
```

`send(bytes_view)` copies user data into the packet pool. `prepare_send()/commit_send()` let the caller write directly into a send slot. The motor driver uses the latter, encoding protocol data directly into the slot to reduce copying and shorten the critical send path.

The interface keeps both paths: general callers can use `send(bytes_view)`, while performance-sensitive drivers use the slot interface. This keeps packet-pool details hidden from most callers while allowing critical paths to encode directly into the send buffer.

This zero-copy scope covers only the host-memory path. UDP socket transmission still goes through the operating system's network stack, so this is not end-to-end zero-copy.

== Hardware Testing and System Tuning
The following Linux recommendations are not part of the library API, but they affect real-world control performance. On heterogeneous platforms such as the RK3588, thread migration and IRQ jitter may have a greater impact than protocol encoding itself. Performance evaluations should therefore distinguish local codec tests, UDP loopback, and real gateway links.

Test platform:

- CPU: RK3588, 4 \* Cortex-A76 2.4GHz + 4 \* Cortex-A55 1.8GHz, 64KiB Cache Line
- OS: GNU/linux ok3588 5.0.209-rt89, SMP, PREEMPT\_RT
- Mem: 8GB 2112MHz
- Network: st\_gmac + realtek r8168

The UDP-to-CAN path mainly uses `st\_gmac` to communicate with the MCU, which controls the CAN bus. The PCIe network card has higher overall throughput, but some operations such as DMA add latency, making it unsuitable for real-time control.

=== Linux Real-Time Support
The kernel already has PREEMPT\_RT enabled. We only need permission to start real-time threads, a frequency-scaling policy, and `SCHED_FIFO` configuration. The related implementation is on the separate #link("https://github.com/jay-waves/servo-fleet/tree/rt-linux")[rt-linux] branch.

This requires platform-specific changes to the source using Linux and pthread APIs, which obviously hurts portability. Sad\~\~

=== Linux CPU Affinity
An ideal division of CPU responsibilities:

- CPU 2: Pin the network card's (`st\_gmac`) IRQ/SoftIRQ to a small core. Avoid the default CPUs 0–1, which handle many system tasks and have significant jitter.
- CPU 3: Pin this program's UDP RX/TX threads to a small core. In practice, letting the OS schedule them also works.
- CPU 7: Pin the control loop to a big core and isolate that core. The loop only reads device state and submits the latest commands.

CPU 2 is the sole writer of device state, while CPU 7 is the sole reader and command sender. This avoids frequent mutex contention and keeps the state buffer within cache lines.

The UDP RX/TX threads may be numerous, but their load is not heavy. In my implementation, I made only these two changes:

- Move the `st\_gmac` IRQ off CPU 0 and pin it to CPU 2.
- Reserve CPU 7 for the control thread, and let the OS schedule the send/receive (ASIO) threads. The network threads use weak scheduling; the control thread is firmly pinned.

The main engineering issue is cross-core cache invalidation. Device state is currently protected by a mutex: the RX thread writes samples, and the control thread reads them. This preserves correct semantics but can cause cache-line migration. Ways to reduce this cost include:

+ Split high-frequency fields by device or field group to reduce unrelated fields sharing a cache line.
+ Have the control thread read a group of device states in batches to reduce lock acquisitions.
+ Keep the RX thread focused on state updates; do not perform expensive computations in the callback.
+ For fields confirmed to be high-frequency and read-only, consider evolving toward double buffering or a sequence lock.
+ Introduce lock-free structures only when measurements show a bottleneck; the current mutex design is simpler and has clear concurrency semantics.

The current implementation prioritizes clear concurrency boundaries: the receive thread owns writes to device state, and the control thread reads snapshots only. Cross-core cache costs are managed by keeping lock scope small and reducing shared writes.

=== CAN Protocol Throughput Tests
The repository contains two related tests:

+ Local codec latency test: encode and decode 20,000 full CAN packets of `MAX_FRAMES_PER_PACKET` frames. The test requires mean and p99 encode/decode latency to stay below 100 µs and at least 10,000 local round trips per second.
+ Backpressure test: submit 24 UDP packets of 128 bytes at once, with a target bandwidth of 102.4 kbps. The test requires actual bandwidth to be 80–115% of the target, an average packet interval of 8–12 ms after rate limiting, a p99 interval no greater than 50 ms, and maximum queueing latency between 120 and 500 ms.

The engineering estimate in the README is about 1.46 Mbps when one UDP packet carries 32 CAN frames at 400 Hz. A system with around 30 motors therefore has almost no headroom at a control bandwidth of 1.5 Mbps.

This bandwidth estimate constrains the protocol design space. When the link approaches its budget, reliable retries, per-frame acknowledgements, and extra diagnostic packets all affect tail latency. Performance tests provide regression boundaries: future changes must be evaluated for both average throughput and tail latency, rather than only the cost of a single encoding operation.
