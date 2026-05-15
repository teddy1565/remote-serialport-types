# remote-serialport-types

> **Language**: [English](#english) · [中文](#中文)

<a id="english"></a>

## English

Shared protocol types and abstract contracts for the **remote-serialport** project — defines the
wire protocol (channels + payloads), the transport abstraction (`AbsTransport`), and the abstract
server / client classes that `remote-serialport-server` and `remote-serialport-client` extend.

This package has **no runtime logic**. It's a pure type / abstract surface. Both downstream packages
embed it as a git submodule under `src/types/remote-serialport-types/`.

### Where it fits

| Package | npm | Role |
|---|---|---|
| [`remote-serialport-types`](https://github.com/teddy1565/remote-serialport-types) | `remote-serialport-types` | **This package.** Shared types + abstracts. |
| [`remote-serialport-server`](https://github.com/teddy1565/remote-serialport-server) | `node-serialport-server` | Owns the physical serial ports; exposes them over a transport. |
| [`remote-serialport-client`](https://github.com/teddy1565/remote-serialport-client) | `node-serialport-client` | Connects to the server; surfaces remote ports as local virtual ports. |

### What's inside

`src/index.ts` — the **wire protocol** itself:

- `REMOTE_SERIALPORT_PROTOCOL_VERSION` (currently `2`).
- `RemoteSerialPortState` enum (`idle → opening → open → closing → closed`, plus `error`).
- Channel name constants and payload interfaces for every direction × mode:
  - Server → Client: `serialport_handshake`, `_state`, `_packet`, `_drain` (+ `_mux_*` variants).
  - Client → Server: `serialport_open`, `_close`, `_send_packet` (+ `_mux_*`).
  - C→S RPC (ack-based): `serialport_get`, `_list`, `_set`, `_update`, `_flush` (+ `_mux_*`).
  - C→S txn: `serialport_send_begin`, `_chunk`, `_end`, `_abort` (+ `_mux_*`).

`src/transport.ts` — the **transport abstraction**:

- `AbsTransport` — bi-directional message transport (one logical channel of remote-serialport messages).
- `AbsTransportEndpoint` — server-side endpoint accepting incoming transports under a label.
- `AbsTransportServer` — top-level server (owns listening socket / IPC parent port).
- `AbsTransportClient` — top-level client (owns the underlying connection / IPC port).
- Concrete implementations live in the server / client repos (`SocketIo*Transport`, `NodeIpc*Transport`).

`src/remote-serial-server.model.ts` — server-side **abstracts**:

- `AbsRemoteSerialServerSocket`, `AbsRemoteSerialServerMuxSocket` — wrappers around one accepted transport.
- `AbsRemoteSerialServerSocketNamespace<T>`, `AbsRemoteSerialServerMuxSocketNamespace<M>` — wrappers around an endpoint.
- `AbsRemoteSerialServer<T, U, M, MN>` — top-level server.
- `RemoteSerialServerOptions` — full option surface (auth, ACL, shared/COW modes, txn timeouts, …).
- Auth/ACL types: `AuthResult`, `AuthValidator`, `AuthTransportMeta`, `RemoteSerialServerAcl`.

`src/remote-serial-client.model.ts` — client-side **abstracts**:

- `AbsRemoteSerialportClientSocket`, `AbsRemoteSerialportClientMuxSocket`.
- `AbsRemoteSerialportClientPortInstance`, `AbsRemoteSerialportClientTxnHandle`.
- `AbsRemoteSerialportClient`.

`src/serialport.ts` — re-exports `SetOptions` / `UpdateOptions` / `PortStatus` / `PortInfo` from
`@serialport/bindings-interface` and defines `SerialPortLike` (permissive structural interface that
both real `SerialPort` and `SerialPortMock` satisfy), `SerialPortFactory`, `SerialPortListProvider`.

`src/logger.ts` — `Logger` interface (pino / winston-shaped: `debug` / `info` / `warn` / `error`,
each takes `(message, ...meta)`).

### Install

```bash
npm install remote-serialport-types
```

When developing the server / client from source, the types are usually consumed as a git submodule
(faster iteration, no publish round-trip). The submodule lives at
`<repo>/src/types/remote-serialport-types/`. After `git submodule update --init`, run
`npm install` **inside the submodule directory too** — it has its own dependencies, and `tsc` on
the parent repo resolves through the submodule path directly to the `.ts` source.

### Protocol stability

The wire-protocol version `2` has been stable across all P1-P5 dev cycles — every addition has been
additive (new channels, new payload fields). Bumping to `3` is reserved for a future
breaking change.

### License

MIT

<a id="中文"></a>

## 中文

**remote-serialport** 專案的共用協定型別 + 抽象介面 — 定義 wire protocol（channels + payloads）、transport 抽象（`AbsTransport`）、以及 server / client 各自繼承的 abstract class。

這個 package **完全沒有 runtime 邏輯**，純型別 + 抽象。兩個下游 package 透過 git submodule 內嵌在 `src/types/remote-serialport-types/`。

### 在整個專案的位置

| Package | npm | 角色 |
|---|---|---|
| [`remote-serialport-types`](https://github.com/teddy1565/remote-serialport-types) | `remote-serialport-types` | **本 package**。共用型別 + 抽象介面 |
| [`remote-serialport-server`](https://github.com/teddy1565/remote-serialport-server) | `node-serialport-server` | 守實體序列埠；透過 transport 對外 |
| [`remote-serialport-client`](https://github.com/teddy1565/remote-serialport-client) | `node-serialport-client` | 連 server；把遠端埠暴露成本地虛擬埠 |

### 內容

`src/index.ts` — **wire protocol** 本體：

- `REMOTE_SERIALPORT_PROTOCOL_VERSION`（目前 `2`）
- `RemoteSerialPortState` enum（`idle → opening → open → closing → closed`、加 `error`）
- 每個方向 × 模式的 channel 名稱常數 + payload 介面：
  - Server → Client：`serialport_handshake`、`_state`、`_packet`、`_drain`（+ `_mux_*` 變體）
  - Client → Server：`serialport_open`、`_close`、`_send_packet`（+ `_mux_*`）
  - C→S RPC（ack-based）：`serialport_get`、`_list`、`_set`、`_update`、`_flush`（+ `_mux_*`）
  - C→S txn：`serialport_send_begin`、`_chunk`、`_end`、`_abort`（+ `_mux_*`）

`src/transport.ts` — **transport 抽象**：

- `AbsTransport` — 雙向訊息傳輸（一條 remote-serialport 訊息邏輯通道）
- `AbsTransportEndpoint` — server 端 endpoint，接受同一 label 的進站 transports
- `AbsTransportServer` — top-level server（持有 listening socket / IPC parent port）
- `AbsTransportClient` — top-level client（持有底層連線 / IPC port）
- 具體實作在 server / client repo（`SocketIo*Transport`、`NodeIpc*Transport`）

`src/remote-serial-server.model.ts` — server 端**抽象 class**：

- `AbsRemoteSerialServerSocket`、`AbsRemoteSerialServerMuxSocket` — 一條接受的 transport wrapper
- `AbsRemoteSerialServerSocketNamespace<T>`、`AbsRemoteSerialServerMuxSocketNamespace<M>` — endpoint wrapper
- `AbsRemoteSerialServer<T, U, M, MN>` — top-level server
- `RemoteSerialServerOptions` — 完整 option 表面（auth、ACL、shared/COW 模式、txn timeouts、…）
- Auth/ACL types：`AuthResult`、`AuthValidator`、`AuthTransportMeta`、`RemoteSerialServerAcl`

`src/remote-serial-client.model.ts` — client 端**抽象 class**：

- `AbsRemoteSerialportClientSocket`、`AbsRemoteSerialportClientMuxSocket`
- `AbsRemoteSerialportClientPortInstance`、`AbsRemoteSerialportClientTxnHandle`
- `AbsRemoteSerialportClient`

`src/serialport.ts` — 從 `@serialport/bindings-interface` 重 export `SetOptions` / `UpdateOptions` / `PortStatus` / `PortInfo`；定義 `SerialPortLike`（permissive 結構介面，真 `SerialPort` 跟 `SerialPortMock` 都符合）、`SerialPortFactory`、`SerialPortListProvider`。

`src/logger.ts` — `Logger` 介面（pino / winston 形狀：`debug` / `info` / `warn` / `error`，每個吃 `(message, ...meta)`）。

### 安裝

```bash
npm install remote-serialport-types
```

從原始碼開發 server / client 時，types 通常以 git submodule 引用（迭代快、不用走 publish）。submodule 位置 `<repo>/src/types/remote-serialport-types/`。`git submodule update --init` 後**也要進那個目錄跑 `npm install`** — 它有自己的依賴，parent repo 的 `tsc` 透過 submodule 路徑直接解析 `.ts` 原始碼。

### 協定穩定性

Wire-protocol 版本 `2` 整段 P1-P5 dev cycle 都沒變過 — 所有新增都是加法（新 channel、新 payload field）。bumping 到 `3` 保留給未來真正的 breaking change。

### License

MIT
