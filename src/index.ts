import { OpenSerialPortOptions } from "./serialport";

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
