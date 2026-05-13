import { OpenSerialPortOptions, SetOptions, UpdateOptions, PortStatus, PortInfo } from "./serialport";

/**
 * Wire-protocol version of remote-serialport.
 *
 * The server announces it in the `serialport_handshake` payload; the client checks compatibility.
 * Bump this on any incompatible change to the channels / payloads below.
 */
export const REMOTE_SERIALPORT_PROTOCOL_VERSION = 2;

/**
 * socket.io namespace-level events the server listens for.
 */
export type SocketIONamespaceOnEvent = "connection"
| "disconnect"
| "error";

/**
 * Lifecycle state of a single remote serial port. Tracked on both server and client side.
 *
 * Connection-level readiness is handled separately by `serialport_handshake`, so there is no
 * "handshaking" state here.
 */
export enum RemoteSerialPortState {
    /** Created, not yet asked to open. */
    IDLE = "idle",
    /** `open()` in progress. */
    OPENING = "opening",
    /** Open and ready for I/O. */
    OPEN = "open",
    /** `close()` in progress. */
    CLOSING = "closing",
    /** Closed cleanly. */
    CLOSED = "closed",
    /** Failed to open, or errored after opening. `message` carries the detail. */
    ERROR = "error"
}

/* ============================================================================
 * Shared payload shapes
 * ========================================================================== */

/**
 * Raw serial bytes.
 *
 * Used by the namespace-mode packet channels (`serialport_packet` / `serialport_send_packet`),
 * where the socket connection itself identifies which remote port the bytes belong to, so no
 * extra addressing is needed in the payload.
 */
export type SerialPortPacket = Buffer | Array<number>;

/**
 * "Open this remote serial port".
 *
 * `path` is the *real* remote serial port path on the server host. In namespace mode it usually
 * equals the socket.io namespace, but when the server runs with `strict_path` disabled it may
 * differ (the namespace is then just a routing label). In mux mode `path` is the only addressing.
 */
export interface SerialPortOpenRequest {
    path: string;
    options: OpenSerialPortOptions;
}

/**
 * A port state change pushed from server to client.
 */
export interface SerialPortStateUpdate {
    state: RemoteSerialPortState;
    /** Human-readable detail, especially for `ERROR`. */
    message?: string;
}

/* ============================================================================
 * Server -> Client
 * ========================================================================== */

/* ---- channels ---- */

/**
 * S->C: sent once, right after the connection is established. Carries the server's protocol version.
 * Replaces the old `{ code: "handshake" }` ping that shared a channel with the client's reply.
 */
export type SocketServerSideEmitChannel_Handshake = "serialport_handshake";
/** S->C (namespace mode): a state change of this connection's remote serial port. */
export type SocketServerSideEmitChannel_State = "serialport_state";
/** S->C (namespace mode): raw bytes read from the remote serial port. One-way stream. */
export type SocketServerSideEmitChannel_Packet = "serialport_packet";
/** S->C (namespace mode): the remote port can accept writes again (backpressure relief, client -> device direction). */
export type SocketServerSideEmitChannel_Drain = "serialport_drain";
/** S->C (mux mode): a state change of a remote serial port, tagged with `path`. */
export type SocketServerSideEmitChannel_Mux_State = "serialport_mux_state";
/** S->C (mux mode): raw bytes read from a remote serial port, tagged with `path`. */
export type SocketServerSideEmitChannel_Mux_Packet = "serialport_mux_packet";
/** S->C (mux mode): a remote port can accept writes again, tagged with `path`. */
export type SocketServerSideEmitChannel_Mux_Drain = "serialport_mux_drain";

export type SocketServerSideEmitChannel = SocketServerSideEmitChannel_Handshake
| SocketServerSideEmitChannel_State
| SocketServerSideEmitChannel_Packet
| SocketServerSideEmitChannel_Drain
| SocketServerSideEmitChannel_Mux_State
| SocketServerSideEmitChannel_Mux_Packet
| SocketServerSideEmitChannel_Mux_Drain;

/* ---- payloads ---- */

/** Payload of `serialport_handshake`. */
export interface SocketServerSideEmitPayload_Handshake {
    /** Wire-protocol version the server speaks. */
    protocolVersion: number;
    message?: string;
}
/** Payload of `serialport_state` (namespace mode). */
export type SocketServerSideEmitPayload_State = SerialPortStateUpdate;
/** Payload of `serialport_packet` (namespace mode): raw bytes. */
export type SocketServerSideEmitPayload_Packet = SerialPortPacket;
/** Payload of `serialport_drain` (namespace mode): none. */
export type SocketServerSideEmitPayload_Drain = void;
/** Payload of `serialport_mux_state` (mux mode). */
export interface SocketServerSideEmitPayload_Mux_State extends SerialPortStateUpdate {
    path: string;
}
/** Payload of `serialport_mux_packet` (mux mode). */
export interface SocketServerSideEmitPayload_Mux_Packet {
    path: string;
    data: SerialPortPacket;
}
/** Payload of `serialport_mux_drain` (mux mode). */
export interface SocketServerSideEmitPayload_Mux_Drain {
    path: string;
}

/**
 * Union of all server -> client payloads.
 *
 * Note: `serialport_packet` is a bare `Buffer | number[]`, so this union is intentionally not
 * fully discriminated. Narrow via the channel name on the typed `emit` / `on` overloads.
 */
export type SocketServerSideEmitPayload = SocketServerSideEmitPayload_Handshake
| SocketServerSideEmitPayload_State
| SocketServerSideEmitPayload_Packet
| SocketServerSideEmitPayload_Mux_State
| SocketServerSideEmitPayload_Mux_Packet
| SocketServerSideEmitPayload_Mux_Drain;

/* ============================================================================
 * Client -> Server
 * ========================================================================== */

/* ---- channels ---- */

/**
 * C->S (namespace mode): open the remote port for this connection.
 *
 * Sent automatically after handshake when the client was created with open options
 * (`connect(namespace, options)`), or manually via `socket.open(options)` after `connect(namespace)`.
 * Replaces the old "reply on the `serialport_handshake` channel" pattern.
 */
export type SocketClientSideEmitChannel_Open = "serialport_open";
/** C->S (namespace mode): close the remote port for this connection. */
export type SocketClientSideEmitChannel_Close = "serialport_close";
/** C->S (namespace mode): write raw bytes to the remote serial port. */
export type SocketClientSideEmitChannel_SendPacket = "serialport_send_packet";
/** C->S (mux mode): open a remote port, tagged with `path`. */
export type SocketClientSideEmitChannel_Mux_Open = "serialport_mux_open";
/** C->S (mux mode): close a remote port, tagged with `path`. */
export type SocketClientSideEmitChannel_Mux_Close = "serialport_mux_close";
/** C->S (mux mode): write raw bytes to a remote serial port, tagged with `path`. */
export type SocketClientSideEmitChannel_Mux_SendPacket = "serialport_mux_send_packet";

export type SocketClientSideEmitChannel = SocketClientSideEmitChannel_Open
| SocketClientSideEmitChannel_Close
| SocketClientSideEmitChannel_SendPacket
| SocketClientSideEmitChannel_Mux_Open
| SocketClientSideEmitChannel_Mux_Close
| SocketClientSideEmitChannel_Mux_SendPacket;

/* ---- payloads ---- */

/** Payload of `serialport_open` (namespace mode). */
export type SocketClientSideEmitPayload_Open = SerialPortOpenRequest;
/** Payload of `serialport_close` (namespace mode): none. */
export type SocketClientSideEmitPayload_Close = void;
/** Payload of `serialport_send_packet` (namespace mode): raw bytes. */
export type SocketClientSideEmitPayload_SendPacket = SerialPortPacket;
/** Payload of `serialport_mux_open` (mux mode). Same shape as namespace-mode open. */
export type SocketClientSideEmitPayload_Mux_Open = SerialPortOpenRequest;
/** Payload of `serialport_mux_close` (mux mode). */
export interface SocketClientSideEmitPayload_Mux_Close {
    path: string;
}
/** Payload of `serialport_mux_send_packet` (mux mode). */
export interface SocketClientSideEmitPayload_Mux_SendPacket {
    path: string;
    data: SerialPortPacket;
}

/**
 * Union of all client -> server payloads.
 *
 * Note: `serialport_send_packet` is a bare `Buffer | number[]`, so this union is intentionally not
 * fully discriminated. Narrow via the channel name on the typed `emit` / `on` overloads.
 */
export type SocketClientSideEmitPayload = SocketClientSideEmitPayload_Open
| SocketClientSideEmitPayload_SendPacket
| SocketClientSideEmitPayload_Mux_Open
| SocketClientSideEmitPayload_Mux_Close
| SocketClientSideEmitPayload_Mux_SendPacket;

/* ============================================================================
 * Client -> Server RPC (remote serial-port control)
 *
 * These address the *physical* port (not the local virtual mock). `set` / `update` / `flush` are
 * fire-and-forget; `get` / `list` use a socket.io ack callback for the response. They are emitted
 * with an always-present payload object (even if empty), so the server handler signature is
 * uniformly `(payload, ack?)`.
 * ========================================================================== */

/** C->S RPC (namespace mode): set modem control lines / break on the physical port. */
export type SocketClientSideRpcChannel_Set = "serialport_set";
/** C->S RPC (namespace mode): update the physical port (e.g. `baudRate`). */
export type SocketClientSideRpcChannel_Update = "serialport_update";
/** C->S RPC (namespace mode): flush the physical port's buffers. */
export type SocketClientSideRpcChannel_Flush = "serialport_flush";
/** C->S RPC (namespace mode): read the physical port's status; response via ack. */
export type SocketClientSideRpcChannel_Get = "serialport_get";
/** C->S RPC: list the serial ports on the server host; response via ack. (Not port-scoped — works in both modes.) */
export type SocketClientSideRpcChannel_List = "serialport_list";
/** C->S RPC (mux mode): set modem control lines / break on a physical port, by `path`. */
export type SocketClientSideRpcChannel_Mux_Set = "serialport_mux_set";
/** C->S RPC (mux mode): update a physical port, by `path`. */
export type SocketClientSideRpcChannel_Mux_Update = "serialport_mux_update";
/** C->S RPC (mux mode): flush a physical port's buffers, by `path`. */
export type SocketClientSideRpcChannel_Mux_Flush = "serialport_mux_flush";
/** C->S RPC (mux mode): read a physical port's status, by `path`; response via ack. */
export type SocketClientSideRpcChannel_Mux_Get = "serialport_mux_get";

export type SocketClientSideRpcChannel = SocketClientSideRpcChannel_Set
| SocketClientSideRpcChannel_Update
| SocketClientSideRpcChannel_Flush
| SocketClientSideRpcChannel_Get
| SocketClientSideRpcChannel_List
| SocketClientSideRpcChannel_Mux_Set
| SocketClientSideRpcChannel_Mux_Update
| SocketClientSideRpcChannel_Mux_Flush
| SocketClientSideRpcChannel_Mux_Get;

/* ---- request payloads ---- */

export interface SocketClientSideRpcPayload_Set {
    options: SetOptions;
}
export interface SocketClientSideRpcPayload_Update {
    options: UpdateOptions;
}
/** `serialport_flush` request payload: none meaningful (sent as `{}`). */
export type SocketClientSideRpcPayload_Flush = Record<string, never>;
/** `serialport_get` request payload: none meaningful (sent as `{}`). */
export type SocketClientSideRpcPayload_Get = Record<string, never>;
/** `serialport_list` request payload: none meaningful (sent as `{}`). */
export type SocketClientSideRpcPayload_List = Record<string, never>;
export interface SocketClientSideRpcPayload_Mux_Set {
    path: string;
    options: SetOptions;
}
export interface SocketClientSideRpcPayload_Mux_Update {
    path: string;
    options: UpdateOptions;
}
export interface SocketClientSideRpcPayload_Mux_Flush {
    path: string;
}
export interface SocketClientSideRpcPayload_Mux_Get {
    path: string;
}

/* ---- ack response payloads ---- */

/** Ack response for `serialport_get` / `serialport_mux_get`. */
export interface SocketRpcResponse_Status {
    ok: boolean;
    status?: PortStatus;
    message?: string;
}
/** Ack response for `serialport_list`. */
export interface SocketRpcResponse_List {
    ok: boolean;
    ports?: PortInfo[];
    message?: string;
}
