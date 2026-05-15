/**
 * Transport abstraction layer for remote-serialport.
 *
 * The wire-protocol (channels + payloads in [./index.ts](./index.ts)) is transport-agnostic.
 * This file defines the minimum surface the server and client logic actually depend on, so the
 * same logic can run over socket.io, in-process IPC (Electron utility process, worker, ...), or
 * any other duplex byte channel.
 *
 * Concrete implementations live in the server / client repos:
 * - `SocketIoServerTransport` / `SocketIoClientTransport` — wrap a socket.io `Socket`
 * - `NodeIpcServerTransport` / `NodeIpcClientTransport` — wrap a `MessagePort` / `parentPort`
 *
 * The socket.io "namespace" is represented at endpoint level ({@link AbsTransportEndpoint});
 * a transport instance always corresponds to one already-routed bi-directional channel.
 */

/**
 * Ack callback handed to a {@link TransportMessageListener} when the peer sent the message with an
 * ack-expecting request (socket.io ack callback, or an envelope-level `ack_id` for IPC).
 *
 * `undefined` when the channel was sent without an ack (one-way emit).
 */
export type TransportAckCallback = (response: unknown) => void;

/**
 * Listener signature for {@link AbsTransport.on}. The second argument is present only when the
 * peer expects a response (RPC). Implementations must always pass exactly the same `payload` shape
 * the wire protocol defines — they don't transform it.
 */
export type TransportMessageListener = (payload: any, ack?: TransportAckCallback) => void;

/**
 * Transport-level lifecycle events.
 *
 * - `"connect"`: the transport is up (first time, or after a reconnect).
 * - `"disconnect"`: the transport went down. The transport may or may not auto-reconnect; check
 *   `"reconnect"` below.
 * - `"reconnect"`: the transport came back up after a disconnect. Implementations that have no
 *   reconnect semantics (e.g. in-process IPC) never fire this — callers should treat absence as
 *   "single lifetime only".
 * - `"error"`: a transport-level error (not a protocol error).
 */
export type TransportLifecycleEvent = "connect" | "disconnect" | "reconnect" | "error";

/**
 * Abstract bi-directional transport carrying one logical channel of remote-serialport messages.
 *
 * One transport instance == one peer connection on one endpoint label. Multiplexing multiple
 * remote ports over a single peer is done at the protocol layer (mux mode) or by creating
 * additional transports against different endpoint labels (namespace mode).
 */
export abstract class AbsTransport {
    /** Stable identifier for this transport (e.g. socket.io `socket.id`, or an IPC-assigned id). */
    abstract get id(): string;

    /** Whether the underlying transport is currently up. */
    abstract get is_connected(): boolean;

    /**
     * Label/path this transport was opened against.
     *
     * For socket.io this is the namespace name (e.g. `"/COM3"`). For IPC transports it is whatever
     * the endpoint assigned (often `""`). Used by namespace-mode helpers such as
     * `AbsRemoteSerialServerSocket.get_serial_path()`.
     */
    abstract get endpoint_label(): string;

    /**
     * Credential the peer sent during the transport handshake (server-side view), or `undefined`
     * if none / not applicable. The library passes this to `auth_validator` to gate connections.
     *
     * - socket.io: returns `socket.handshake.auth` (set by the client via `Manager({auth: ...})`).
     * - Node IPC: returns whatever the client sent in its initial `hello` envelope; the endpoint
     *   delays firing `on_connection` until that envelope arrives, so this getter is populated by
     *   the time consumer code observes the new transport.
     * - Client-side transports return `undefined` (the server doesn't send a peer credential to
     *   the client).
     */
    abstract get credential(): unknown;

    /* ---- send ---- */

    /** Send a one-way message on `channel`. No response expected. */
    abstract send(channel: string, payload?: unknown): void;

    /**
     * Send a request on `channel` and await an ack. Implementations may use socket.io ack
     * callbacks or an envelope-level `ack_id` scheme.
     *
     * The promise rejects on:
     * - timeout (wall-clock from the call site, not reset on reconnect)
     * - transport close while in-flight (unless the implementation replays — see
     *   `replay_on_reconnect`)
     */
    abstract send_rpc(channel: string, payload: unknown, timeout_ms: number): Promise<unknown>;

    /* ---- receive ---- */

    /** Register a listener for a channel. The listener may receive an optional ack callback. */
    abstract on(channel: string, listener: TransportMessageListener): void;
    /** Register a one-shot listener for a channel. */
    abstract once(channel: string, listener: TransportMessageListener): void;
    /** Remove a listener (or all listeners on `channel` if `listener` is omitted). */
    abstract off(channel: string, listener?: TransportMessageListener): void;

    /* ---- lifecycle ---- */

    /** Subscribe to a lifecycle event. */
    abstract on_lifecycle(event: TransportLifecycleEvent, listener: (...args: any[]) => void): void;
    /** Unsubscribe a lifecycle listener. */
    abstract off_lifecycle(event: TransportLifecycleEvent, listener: (...args: any[]) => void): void;

    /* ---- wire-level introspection ---- */

    /**
     * Bytes currently buffered in the underlying wire, for wire-level backpressure sampling.
     * Returns `null` if the transport cannot report this (e.g. in-process IPC, where there is
     * no useful buffer indicator).
     */
    abstract get_buffered_amount(): number | null;

    /* ---- teardown ---- */

    /** Close this transport. Idempotent. */
    abstract close(): void;
}

/**
 * Server-side endpoint accepting incoming transports under a label.
 *
 * For socket.io this corresponds to one namespace (`io.of(label)`). For IPC this corresponds to
 * one `parentPort`-style entry point.
 */
export abstract class AbsTransportEndpoint {
    /** Label this endpoint accepts. */
    abstract get label(): string | RegExp;

    /** Notified when a new transport (= an incoming peer) connects on this endpoint. */
    abstract on_connection(listener: (transport: AbsTransport) => void): void;

    /** Disconnect every transport currently on this endpoint. */
    abstract close_all(): void;
}

/**
 * Server-side top-level transport (owns the listening socket / IPC parent port).
 */
export abstract class AbsTransportServer {
    /**
     * Start listening for incoming peers.
     *
     * @param port - TCP port (socket.io transports). Ignored by transports that don't listen on
     *   TCP (e.g. IPC); pass `undefined` in that case.
     */
    abstract listen(port?: number): void;

    /**
     * Get an endpoint for the given label. Duplicate labels return the same endpoint instance.
     */
    abstract of(label: string | RegExp): AbsTransportEndpoint;

    /** Disconnect all endpoints and shut down the underlying listener. Idempotent. */
    abstract close(): void;
}

/**
 * Client-side top-level transport (owns the underlying connection / IPC client port).
 *
 * Conceptually owns "the wire". Each call to {@link open} produces a multiplexed
 * {@link AbsTransport} on the same wire; socket.io implements this with namespaces, IPC with an
 * envelope-level `ns` field.
 */
export abstract class AbsTransportClient {
    /**
     * Open (or reuse) a transport for the given endpoint label. Duplicate labels return the same
     * transport instance.
     */
    abstract open(label: string): AbsTransport;

    /** Disconnect everything and tear down the wire. Idempotent. */
    abstract close(): void;
}
