import { Server, Namespace, Socket } from "socket.io";

import { SerialPortFactory, SerialPortListProvider } from "./serialport";
import { Logger } from "./logger";

import { RemoteSerialPortState,
    SerialPortPacket,
    SocketServerSideEmitChannel_Handshake,
    SocketServerSideEmitChannel_State,
    SocketServerSideEmitChannel_Packet,
    SocketServerSideEmitChannel_Drain,
    SocketServerSideEmitChannel_Mux_State,
    SocketServerSideEmitChannel_Mux_Packet,
    SocketServerSideEmitChannel_Mux_Drain,
    SocketServerSideEmitPayload_Handshake,
    SocketServerSideEmitPayload_State,
    SocketServerSideEmitPayload_Mux_State,
    SocketServerSideEmitPayload_Mux_Packet,
    SocketServerSideEmitPayload_Mux_Drain,
    SocketClientSideEmitChannel_Open,
    SocketClientSideEmitChannel_Close,
    SocketClientSideEmitChannel_SendPacket,
    SocketClientSideEmitChannel_Mux_Open,
    SocketClientSideEmitChannel_Mux_Close,
    SocketClientSideEmitChannel_Mux_SendPacket,
    SocketClientSideEmitPayload_Open,
    SocketClientSideEmitPayload_Mux_Open,
    SocketClientSideEmitPayload_Mux_Close,
    SocketClientSideEmitPayload_Mux_SendPacket,
    SocketClientSideRpcChannel_Set,
    SocketClientSideRpcChannel_Update,
    SocketClientSideRpcChannel_Flush,
    SocketClientSideRpcChannel_Get,
    SocketClientSideRpcChannel_List,
    SocketClientSideRpcChannel_Mux_Set,
    SocketClientSideRpcChannel_Mux_Update,
    SocketClientSideRpcChannel_Mux_Flush,
    SocketClientSideRpcChannel_Mux_Get,
    SocketClientSideRpcPayload_Set,
    SocketClientSideRpcPayload_Update,
    SocketClientSideRpcPayload_Mux_Set,
    SocketClientSideRpcPayload_Mux_Update,
    SocketClientSideRpcPayload_Mux_Flush,
    SocketClientSideRpcPayload_Mux_Get,
    SocketRpcResponse_Status,
    SocketRpcResponse_List,
    SocketClientSideTxnChannel_Begin,
    SocketClientSideTxnChannel_Chunk,
    SocketClientSideTxnChannel_End,
    SocketClientSideTxnChannel_Abort,
    SocketClientSideTxnChannel_Mux_Begin,
    SocketClientSideTxnChannel_Mux_Chunk,
    SocketClientSideTxnChannel_Mux_End,
    SocketClientSideTxnChannel_Mux_Abort,
    SocketClientSideTxnPayload_Begin,
    SocketClientSideTxnPayload_Chunk,
    SocketClientSideTxnPayload_End,
    SocketClientSideTxnPayload_Abort,
    SocketClientSideTxnPayload_Mux_Begin,
    SocketClientSideTxnPayload_Mux_Chunk,
    SocketClientSideTxnPayload_Mux_End,
    SocketClientSideTxnPayload_Mux_Abort,
    SocketIONamespaceOnEvent } from "./index";

/**
 * Options for a {@link AbsRemoteSerialServer} instance.
 */
export interface RemoteSerialServerOptions {
    /**
     * When `true` (default): a client's `options.path` must match the namespace regexp, and in
     * namespace mode the port path is forced to the namespace-derived value.
     * When `false`: the socket.io namespace is just a routing label and the client's `options.path`
     * is used as the real remote serial path (still validated against the regexp).
     */
    strict_path?: boolean;
    /**
     * When `true`: every accepted connection is automatically {@link AbsRemoteSerialServerSocket.pipe}d
     * (physical-port data <-> socket forwarding wired up in both directions).
     * Default `false` — call `socket.pipe()` yourself, or wire `socket.port` manually if you need to
     * transform data in transit (don't do both, or data is forwarded twice).
     */
    auto_pipe?: boolean;
    /**
     * Provider for the `serialport_list` RPC. Default: `() => SerialPort.list()`. Inject a custom one
     * in tests (the real `SerialPort.list()` does not see `SerialPortMock` ports).
     */
    port_list_provider?: SerialPortListProvider;
    /**
     * Logger sink. Default: warn/error -> `console`, debug/info discarded.
     */
    logger?: Logger;
    /**
     * Behavior when multiple clients connect to the same physical port path.
     * - `'reject'` (default): the second client gets a `serialport_state: ERROR` (current behavior).
     * - `'shared'`: clients share one refcounted `PortSession`; see {@link shared_mode}.
     */
    multi_access?: "reject" | "shared";
    /**
     * Scheduling/writer policy used when {@link multi_access} is `'shared'`. Ignored otherwise.
     *
     * - `'fifo'` (default): writes serialize by `serialport_send_begin` (or single-shot) arrival order;
     *   head-of-line blocking on slow transactions.
     * - `'fifo-strict'`: like `'fifo'`, but the server allows only one in-flight transaction across
     *   all clients (stop-and-wait at the server). New `begin`s queue server-side until the current
     *   txn fully drains.
     * - `'batch'`: writes serialize by `serialport_send_end` arrival order (or single-shot arrival for
     *   atomic packets); no head-of-line blocking — a transaction that finishes first ships first.
     * - `'pipe'`: only the earliest-connected client is the writer; later clients are read-only.
     *   Their writes are dropped (with a one-shot `serialport_state: ERROR` notice) but their send
     *   window is still drained. When the writer disconnects, the next earliest live client is
     *   auto-promoted to writer.
     */
    shared_mode?: "fifo" | "fifo-strict" | "batch" | "pipe";
    /**
     * Per-transaction timeout (ms). Reset whenever a new chunk arrives. If neither `serialport_send_end`
     * nor `serialport_send_abort` arrives within the window of the last chunk, the buffered chunks are
     * dropped. Default `5000`.
     */
    txn_timeout_ms?: number;
    /**
     * What to do when a transaction times out.
     * - `'log'` (default): server logger `warn`, buffered chunks dropped silently from the client's view.
     * - `'state'`: also emit `serialport_state: ERROR` to the originating client (note: this also
     *   pollutes the port-level state machine).
     * - `'both'`: log + state.
     */
    txn_timeout_action?: "log" | "state" | "both";
}

/**
 * Proxy around a physical serial port, exposed to server-app code as `socket.port`.
 *
 * The library bridges it both ways: physical-port `data` -> `emit("data")`, and `write(...)` /
 * `"write-command"` -> physical-port write. App code can sit in the middle (e.g. transform bytes
 * before forwarding) or just call {@link AbsRemoteSerialServerSocket.pipe} to auto-wire it.
 */
export interface AbsRemoteSerialServerSocketPort {
    /** Push physical-port data into this proxy (library internal; app code listens via `on("data")`). */
    emit(event: "data", chunk: SerialPortPacket): boolean;
    /** Listen to bytes read from the physical serial port. */
    on(event: "data", listener: (data: SerialPortPacket) => void): this;
    /** Listen to write commands queued for the physical port (library internal). */
    on(event: "write-command", listener: (command: Buffer) => void): this;
    once(event: "data", listener: (data: SerialPortPacket) => void): this;
    once(event: "write-command", listener: (command: Buffer) => void): this;
    /** Write bytes to the physical serial port (delivered via the `write-command` event). */
    write(data: Buffer): void;
    removeAllListeners(event?: string): this;
}

/**
 * Server side of one remote serial port, addressed by a socket.io namespace ("namespace mode").
 *
 * One per accepted connection; wraps the socket.io `Socket` plus the physical `SerialPort`.
 */
export abstract class AbsRemoteSerialServerSocket {
    protected abstract _socket: Socket;

    /** Current lifecycle state of the physical serial port. */
    abstract get state(): RemoteSerialPortState;

    /** Proxy of the physical serial port (see {@link AbsRemoteSerialServerSocketPort}). */
    abstract get port(): AbsRemoteSerialServerSocketPort;

    /* ---- emit (server -> client) ---- */

    /** Announce server readiness + protocol version (sent automatically on connect). */
    abstract emit(channel: SocketServerSideEmitChannel_Handshake, message: SocketServerSideEmitPayload_Handshake): void;
    /** Notify the client of a port state change. */
    abstract emit(channel: SocketServerSideEmitChannel_State, message: SocketServerSideEmitPayload_State): void;
    /** Send raw bytes read from the physical serial port. */
    abstract emit(channel: SocketServerSideEmitChannel_Packet, message: SerialPortPacket): void;
    /** Notify the client the physical port can accept writes again (backpressure relief). */
    abstract emit(channel: SocketServerSideEmitChannel_Drain): void;

    /* ---- on (client -> server) ---- */

    /** Client asks to open the remote port. */
    abstract on(channel: SocketClientSideEmitChannel_Open, listener: (data: SocketClientSideEmitPayload_Open) => void): void;
    /** Client asks to close the remote port. */
    abstract on(channel: SocketClientSideEmitChannel_Close, listener: () => void): void;
    /** Client sends raw bytes to write to the physical serial port. */
    abstract on(channel: SocketClientSideEmitChannel_SendPacket, listener: (data: SerialPortPacket) => void): void;
    /** Client requests setting modem control lines / break on the physical port. */
    abstract on(channel: SocketClientSideRpcChannel_Set, listener: (data: SocketClientSideRpcPayload_Set) => void): void;
    /** Client requests updating the physical port (e.g. `baudRate`). */
    abstract on(channel: SocketClientSideRpcChannel_Update, listener: (data: SocketClientSideRpcPayload_Update) => void): void;
    /** Client requests flushing the physical port's buffers. */
    abstract on(channel: SocketClientSideRpcChannel_Flush, listener: () => void): void;
    /** Client requests the physical port's status; respond via the ack callback. */
    abstract on(channel: SocketClientSideRpcChannel_Get, listener: (data: Record<string, never>, ack: (response: SocketRpcResponse_Status) => void) => void): void;
    /** Client requests the host's serial port list; respond via the ack callback. */
    abstract on(channel: SocketClientSideRpcChannel_List, listener: (data: Record<string, never>, ack: (response: SocketRpcResponse_List) => void) => void): void;
    /** Client starts a multi-chunk transaction. */
    abstract on(channel: SocketClientSideTxnChannel_Begin, listener: (data: SocketClientSideTxnPayload_Begin) => void): void;
    /** Client appends a chunk to an open transaction. */
    abstract on(channel: SocketClientSideTxnChannel_Chunk, listener: (data: SocketClientSideTxnPayload_Chunk) => void): void;
    /** Client closes a transaction; server schedules the buffered bytes for writing. */
    abstract on(channel: SocketClientSideTxnChannel_End, listener: (data: SocketClientSideTxnPayload_End) => void): void;
    /** Client aborts a transaction; server discards the buffered chunks. */
    abstract on(channel: SocketClientSideTxnChannel_Abort, listener: (data: SocketClientSideTxnPayload_Abort) => void): void;

    /* ---- once (client -> server) ---- */

    abstract once(channel: SocketClientSideEmitChannel_Open, listener: (data: SocketClientSideEmitPayload_Open) => void): void;
    abstract once(channel: SocketClientSideEmitChannel_Close, listener: () => void): void;
    abstract once(channel: SocketClientSideEmitChannel_SendPacket, listener: (data: SerialPortPacket) => void): void;

    /**
     * Auto-wire the physical port <-> socket forwarding in both directions:
     * physical `data` -> `serialport_packet`, and incoming `serialport_send_packet` -> physical write.
     * Idempotent. Don't combine with manual `socket.port` wiring (would forward data twice).
     */
    abstract pipe(): void;

    /**
     * Disconnects this client.
     * @param close - if `true`, closes the underlying connection
     */
    abstract disconnect(close?: boolean): void;

    get id(): string {
        return this._socket.id;
    }

    get connected(): boolean {
        return this._socket.connected;
    }

    get disconnected(): boolean {
        return this._socket.disconnected;
    }

    get nsp() {
        return this._socket.nsp;
    }

    /**
     * The serial port path derived from the socket.io namespace.
     *
     * On Windows the path is like `COM1`; the socket.io namespace must be `/COM1`, so the leading
     * slash is stripped here. On Linux the path is like `/dev/ttyUSB0` and is returned as-is.
     *
     * Note: when the server runs with `strict_path` disabled, the *actual* port path may come from
     * the client's open request instead; this getter still returns the namespace-derived value.
     * @param filter_regex - regexp deciding when to strip the leading slash (default: `/^(\/COM)[0-9]+$/`)
     */
    public get_serial_path(filter_regex: string | RegExp = /^(\/COM)[0-9]+$/): string {
        const origin_namespace = this._socket.nsp.name;

        if (origin_namespace.match(filter_regex) !== null) {
            return origin_namespace.replace("/", "");
        }

        return origin_namespace;
    }

    /** Convenience: {@link get_serial_path} with the default filter. */
    get serialport_path(): string {
        return this.get_serial_path();
    }
}

/**
 * Server side of a *mux* connection: one socket on a "mux namespace" carrying any number of remote
 * serial ports, each addressed by `path` inside the payloads ("mux mode" — dynamic addressing).
 */
export abstract class AbsRemoteSerialServerMuxSocket {
    protected abstract _socket: Socket;

    /** Current lifecycle state of the remote port at `path` (`IDLE` if unknown). */
    abstract get_state(path: string): RemoteSerialPortState;

    /** Proxy of the physical serial port at `path` (created on first access / open). */
    abstract port(path: string): AbsRemoteSerialServerSocketPort;

    /* ---- emit (server -> client) ---- */

    abstract emit(channel: SocketServerSideEmitChannel_Handshake, message: SocketServerSideEmitPayload_Handshake): void;
    abstract emit(channel: SocketServerSideEmitChannel_Mux_State, message: SocketServerSideEmitPayload_Mux_State): void;
    abstract emit(channel: SocketServerSideEmitChannel_Mux_Packet, message: SocketServerSideEmitPayload_Mux_Packet): void;
    abstract emit(channel: SocketServerSideEmitChannel_Mux_Drain, message: SocketServerSideEmitPayload_Mux_Drain): void;

    /* ---- on (client -> server) ---- */

    abstract on(channel: SocketClientSideEmitChannel_Mux_Open, listener: (data: SocketClientSideEmitPayload_Mux_Open) => void): void;
    abstract on(channel: SocketClientSideEmitChannel_Mux_Close, listener: (data: SocketClientSideEmitPayload_Mux_Close) => void): void;
    abstract on(channel: SocketClientSideEmitChannel_Mux_SendPacket, listener: (data: SocketClientSideEmitPayload_Mux_SendPacket) => void): void;
    /** Client requests setting modem control lines / break on a physical port, by `path`. */
    abstract on(channel: SocketClientSideRpcChannel_Mux_Set, listener: (data: SocketClientSideRpcPayload_Mux_Set) => void): void;
    /** Client requests updating a physical port, by `path`. */
    abstract on(channel: SocketClientSideRpcChannel_Mux_Update, listener: (data: SocketClientSideRpcPayload_Mux_Update) => void): void;
    /** Client requests flushing a physical port's buffers, by `path`. */
    abstract on(channel: SocketClientSideRpcChannel_Mux_Flush, listener: (data: SocketClientSideRpcPayload_Mux_Flush) => void): void;
    /** Client requests a physical port's status, by `path`; respond via the ack callback. */
    abstract on(channel: SocketClientSideRpcChannel_Mux_Get, listener: (data: SocketClientSideRpcPayload_Mux_Get, ack: (response: SocketRpcResponse_Status) => void) => void): void;
    /** Client requests the host's serial port list; respond via the ack callback. */
    abstract on(channel: SocketClientSideRpcChannel_List, listener: (data: Record<string, never>, ack: (response: SocketRpcResponse_List) => void) => void): void;
    /** Client starts a multi-chunk transaction on a specific remote port. */
    abstract on(channel: SocketClientSideTxnChannel_Mux_Begin, listener: (data: SocketClientSideTxnPayload_Mux_Begin) => void): void;
    /** Client appends a chunk to an open transaction on a specific remote port. */
    abstract on(channel: SocketClientSideTxnChannel_Mux_Chunk, listener: (data: SocketClientSideTxnPayload_Mux_Chunk) => void): void;
    /** Client closes a transaction on a specific remote port. */
    abstract on(channel: SocketClientSideTxnChannel_Mux_End, listener: (data: SocketClientSideTxnPayload_Mux_End) => void): void;
    /** Client aborts a transaction on a specific remote port. */
    abstract on(channel: SocketClientSideTxnChannel_Mux_Abort, listener: (data: SocketClientSideTxnPayload_Mux_Abort) => void): void;

    /* ---- once (client -> server) ---- */

    abstract once(channel: SocketClientSideEmitChannel_Mux_Open, listener: (data: SocketClientSideEmitPayload_Mux_Open) => void): void;
    abstract once(channel: SocketClientSideEmitChannel_Mux_Close, listener: (data: SocketClientSideEmitPayload_Mux_Close) => void): void;
    abstract once(channel: SocketClientSideEmitChannel_Mux_SendPacket, listener: (data: SocketClientSideEmitPayload_Mux_SendPacket) => void): void;

    /** Auto-wire physical <-> socket forwarding for every port on this mux connection. Idempotent. */
    abstract pipe(): void;

    /** Disconnects this client. */
    abstract disconnect(close?: boolean): void;
}

/**
 * Wrapper around a socket.io namespace that emits {@link AbsRemoteSerialServerSocket}s on `connection`.
 */
export abstract class AbsRemoteSerialServerSocketNamespace<T extends AbsRemoteSerialServerSocket> {
    protected abstract _namespace: Namespace;

    /**
     * Adds a listener for a namespace-level event (`connection` / `disconnect` / `error`).
     * The `connection` listener receives a wrapped {@link AbsRemoteSerialServerSocket}.
     */
    abstract on(ev: SocketIONamespaceOnEvent, listener: (socket: T) => void): void;
}

/**
 * Wrapper around a socket.io namespace that emits {@link AbsRemoteSerialServerMuxSocket}s on `connection`.
 */
export abstract class AbsRemoteSerialServerMuxSocketNamespace<M extends AbsRemoteSerialServerMuxSocket> {
    protected abstract _namespace: Namespace;

    abstract on(ev: SocketIONamespaceOnEvent, listener: (socket: M) => void): void;
}

/**
 * Top-level server: owns the socket.io `Server` and exposes namespace-mode (`of`) and mux-mode (`mux`)
 * endpoints.
 */
export abstract class AbsRemoteSerialServer<
    T extends AbsRemoteSerialServerSocket,
    U extends AbsRemoteSerialServerSocketNamespace<T>,
    M extends AbsRemoteSerialServerMuxSocket = AbsRemoteSerialServerMuxSocket,
    MN extends AbsRemoteSerialServerMuxSocketNamespace<M> = AbsRemoteSerialServerMuxSocketNamespace<M>
> {
    protected abstract SERIALPORT_NAMESPACE_REGEXP: RegExp | string;
    protected abstract SERVER_PORT: number;
    protected abstract io: Server;

    /** When `true`, validate/force `options.path` against the namespace regexp (see {@link RemoteSerialServerOptions}). */
    protected abstract strict_path: boolean;
    /** When `true`, auto-`pipe()` every accepted connection (see {@link RemoteSerialServerOptions}). */
    protected abstract auto_pipe: boolean;

    /**
     * Create a wrapped server socket for an accepted connection.
     *
     * The concrete implementation injects the physical-port factory ({@link SerialPortFactory}) so the
     * actual `SerialPort` can be substituted (e.g. a mock in tests).
     * @param socket - socket.io socket instance
     */
    protected abstract create_remote_serial_server_socket_port(socket: Socket): T;

    /**
     * Create a wrapped namespace. Namespaces are unique; the same namespace returns the same wrapper.
     *
     * The concrete implementation must hand the namespace wrapper the per-socket factory above, so
     * each `socket.id` maps to exactly one {@link AbsRemoteSerialServerSocket}.
     * @param namespace - socket.io namespace instance
     */
    protected abstract create_remote_serial_server_socket_namespace(namespace: Namespace): U;

    /** Create a wrapped mux server socket for an accepted connection on a mux namespace. */
    protected abstract create_remote_serial_server_mux_socket(socket: Socket): M;

    /** Create a wrapped mux namespace. */
    protected abstract create_remote_serial_server_mux_socket_namespace(namespace: Namespace): MN;

    /**
     * Start listening for incoming connections.
     * @param serverport - port number (default: the configured `SERVER_PORT`)
     */
    public listen(serverport: number = this.SERVER_PORT): void {
        this.io.listen(serverport);
    }

    /**
     * Get the namespace-mode endpoint for the given namespace (one remote serial port per connection).
     * Duplicate namespaces return the same wrapper.
     * @param namespace - namespace (or regexp) to accept connections on; defaults to the configured regexp
     */
    public of(namespace: string | RegExp = this.SERIALPORT_NAMESPACE_REGEXP): U {
        const namespaceInstance = this.io.of(namespace);
        return this.create_remote_serial_server_socket_namespace(namespaceInstance);
    }

    /**
     * Get the mux-mode endpoint on the given mux namespace (many remote ports per connection,
     * addressed dynamically by `path`).
     * @param namespace - mux namespace (or regexp); defaults to `/`
     */
    public mux(namespace: string | RegExp = "/"): MN {
        const namespaceInstance = this.io.of(namespace);
        return this.create_remote_serial_server_mux_socket_namespace(namespaceInstance);
    }
}
