import { Manager, Socket } from "socket.io-client";

import { OpenSerialPortOptions, SetOptions, UpdateOptions, PortStatus, PortInfo } from "./serialport";

import { SerialPortStream, OpenOptions } from "@serialport/stream";

import { CreatePortOptions } from "@serialport/binding-mock";

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
    SocketClientSideRpcChannel_Mux_Set,
    SocketClientSideRpcChannel_Mux_Update,
    SocketClientSideRpcChannel_Mux_Flush,
    SocketClientSideRpcPayload_Set,
    SocketClientSideRpcPayload_Update,
    SocketClientSideRpcPayload_Mux_Set,
    SocketClientSideRpcPayload_Mux_Update,
    SocketClientSideRpcPayload_Mux_Flush } from "./index";

/**
 * Open options passed to a local mock `SerialPortStream` (the virtual port the client app uses).
 * `path` and `binding` are filled in by the library.
 */
export interface OpenOptionsForSerialPortStream extends Partial<OpenOptions> {
    path?: string;
    baudRate: number;
}

/**
 * @deprecated Misspelled. Use {@link OpenOptionsForSerialPortStream}. Kept as an alias for one release.
 */
export type OpenOptoinsForSerialPortStream = OpenOptionsForSerialPortStream;

/**
 * Encapsulates one local virtual (mock-backed) serial port — a mirror of one remote serial port.
 *
 * The client app gets a real `SerialPortStream` from {@link get_port} and uses it like any serialport.
 * Bytes the remote port produces are pushed in via {@link write}; bytes the app writes go out to the
 * remote end (handled by the concrete stream, not here).
 */
export abstract class AbsRemoteSerialportClientPortInstance {

    /** Local mock-binding registry path for this virtual port (unique within the process). */
    protected abstract port_path: string;

    /** Current lifecycle state of the *remote* port this virtual port mirrors. */
    abstract get state(): RemoteSerialPortState;

    /**
     * Get (or lazily create) the local virtual serial port stream.
     * @param open_options - open options for the local mock `SerialPortStream`
     */
    public abstract get_port(open_options: OpenOptionsForSerialPortStream): SerialPortStream;

    /**
     * Push bytes received from the remote serial port into this local virtual port,
     * so the app reading the stream sees them.
     */
    public abstract write(data: SerialPortPacket): void;

    /** Tear down this local virtual port (close the stream, drop the mock binding). */
    public abstract close(): void;
}

/**
 * Client side of one remote serial port, addressed by a socket.io namespace ("namespace mode").
 *
 * One of these per {@link AbsRemoteSerialportClient.connect}; one socket connection (multiplexed over
 * the shared `Manager`) per remote port.
 */
export abstract class AbsRemoteSerialportClientSocket {
    protected abstract _socket: Socket;

    /** Open options used to open the remote port. `null` until {@link open} is called in manual mode. */
    protected abstract _open_options: OpenSerialPortOptions | null;

    /** Current lifecycle state of the remote port. */
    abstract get state(): RemoteSerialPortState;

    /* ---- emit (client -> server) ---- */

    /** Write raw bytes to the remote serial port. */
    abstract emit(channel: SocketClientSideEmitChannel_SendPacket, message: SerialPortPacket): void;
    /** Ask the server to open the remote port. */
    abstract emit(channel: SocketClientSideEmitChannel_Open, message: SocketClientSideEmitPayload_Open): void;
    /** Ask the server to close the remote port. */
    abstract emit(channel: SocketClientSideEmitChannel_Close): void;
    /** Set modem control lines / break on the remote physical port (fire-and-forget). */
    abstract emit(channel: SocketClientSideRpcChannel_Set, message: SocketClientSideRpcPayload_Set): void;
    /** Update the remote physical port, e.g. `baudRate` (fire-and-forget). */
    abstract emit(channel: SocketClientSideRpcChannel_Update, message: SocketClientSideRpcPayload_Update): void;
    /** Flush the remote physical port's buffers (fire-and-forget). */
    abstract emit(channel: SocketClientSideRpcChannel_Flush): void;

    /* ---- on (server -> client) ---- */

    /** Server announced it is ready + its protocol version. */
    abstract on(channel: SocketServerSideEmitChannel_Handshake, listener: (data: SocketServerSideEmitPayload_Handshake) => void): void;
    /** Remote port state changed. */
    abstract on(channel: SocketServerSideEmitChannel_State, listener: (data: SocketServerSideEmitPayload_State) => void): void;
    /** Raw bytes from the remote serial port. */
    abstract on(channel: SocketServerSideEmitChannel_Packet, listener: (data: SerialPortPacket) => void): void;
    /** Remote port can accept writes again (backpressure relief). */
    abstract on(channel: SocketServerSideEmitChannel_Drain, listener: () => void): void;

    /* ---- once (server -> client) ---- */

    abstract once(channel: SocketServerSideEmitChannel_Handshake, listener: (data: SocketServerSideEmitPayload_Handshake) => void): void;
    abstract once(channel: SocketServerSideEmitChannel_State, listener: (data: SocketServerSideEmitPayload_State) => void): void;
    abstract once(channel: SocketServerSideEmitChannel_Packet, listener: (data: SerialPortPacket) => void): void;
    abstract once(channel: SocketServerSideEmitChannel_Drain, listener: () => void): void;

    /**
     * Manually open the remote port. Used when the socket was created via `connect(namespace)` without
     * open options; when created via `connect(namespace, options)` the open happens automatically.
     */
    abstract open(options: OpenSerialPortOptions): void;

    /** Ask the server to close the remote port (does not disconnect the socket). */
    abstract close(): void;

    /* ---- remote physical-port control (RPC; the local virtual port's own set/get/update/flush are unaffected) ---- */

    /** Set modem control lines / break on the remote *physical* port. */
    abstract set_remote(options: SetOptions): void;
    /** Update the remote *physical* port, e.g. `baudRate`. */
    abstract update_remote(options: UpdateOptions): void;
    /** Flush the remote *physical* port's buffers. */
    abstract flush_remote(): void;
    /** Read the remote *physical* port's status (CTS / DSR / DCD). */
    abstract get_remote_status(): Promise<PortStatus>;
    /** List the serial ports available on the server host (`SerialPort.list()`). */
    abstract list_ports(): Promise<PortInfo[]>;

    /** Disconnect this socket and release its local virtual ports / listeners. */
    abstract disconnect(close?: boolean): void;

    /**
     * Create a local virtual (mock-backed) serial port that mirrors this remote port.
     * @param local_path - local serialport path the app will use (also the mock-binding registry key)
     * @param opt - mock create-port options (`echo` is forced on)
     */
    abstract create_port(local_path: string, opt?: CreatePortOptions): AbsRemoteSerialportClientPortInstance;
}

/**
 * Client side of a *mux* connection: one socket on a "mux namespace", carrying any number of remote
 * serial ports, each addressed by `path` inside the payloads ("mux mode" — for dynamic addressing,
 * e.g. IoT mesh, where you don't want a namespace per port).
 */
export abstract class AbsRemoteSerialportClientMuxSocket {
    protected abstract _socket: Socket;

    /** Current lifecycle state of the remote port at `path` (`IDLE` if unknown). */
    abstract get_state(path: string): RemoteSerialPortState;

    /* ---- emit (client -> server) ---- */

    /** Ask the server to open a remote port. */
    abstract emit(channel: SocketClientSideEmitChannel_Mux_Open, message: SocketClientSideEmitPayload_Mux_Open): void;
    /** Ask the server to close a remote port. */
    abstract emit(channel: SocketClientSideEmitChannel_Mux_Close, message: SocketClientSideEmitPayload_Mux_Close): void;
    /** Write raw bytes to a remote serial port. */
    abstract emit(channel: SocketClientSideEmitChannel_Mux_SendPacket, message: SocketClientSideEmitPayload_Mux_SendPacket): void;
    /** Set modem control lines / break on a remote physical port (fire-and-forget). */
    abstract emit(channel: SocketClientSideRpcChannel_Mux_Set, message: SocketClientSideRpcPayload_Mux_Set): void;
    /** Update a remote physical port, e.g. `baudRate` (fire-and-forget). */
    abstract emit(channel: SocketClientSideRpcChannel_Mux_Update, message: SocketClientSideRpcPayload_Mux_Update): void;
    /** Flush a remote physical port's buffers (fire-and-forget). */
    abstract emit(channel: SocketClientSideRpcChannel_Mux_Flush, message: SocketClientSideRpcPayload_Mux_Flush): void;

    /* ---- on (server -> client) ---- */

    abstract on(channel: SocketServerSideEmitChannel_Handshake, listener: (data: SocketServerSideEmitPayload_Handshake) => void): void;
    abstract on(channel: SocketServerSideEmitChannel_Mux_State, listener: (data: SocketServerSideEmitPayload_Mux_State) => void): void;
    abstract on(channel: SocketServerSideEmitChannel_Mux_Packet, listener: (data: SocketServerSideEmitPayload_Mux_Packet) => void): void;
    abstract on(channel: SocketServerSideEmitChannel_Mux_Drain, listener: (data: SocketServerSideEmitPayload_Mux_Drain) => void): void;

    /* ---- once (server -> client) ---- */

    abstract once(channel: SocketServerSideEmitChannel_Handshake, listener: (data: SocketServerSideEmitPayload_Handshake) => void): void;
    abstract once(channel: SocketServerSideEmitChannel_Mux_State, listener: (data: SocketServerSideEmitPayload_Mux_State) => void): void;
    abstract once(channel: SocketServerSideEmitChannel_Mux_Packet, listener: (data: SocketServerSideEmitPayload_Mux_Packet) => void): void;
    abstract once(channel: SocketServerSideEmitChannel_Mux_Drain, listener: (data: SocketServerSideEmitPayload_Mux_Drain) => void): void;

    /** Open a remote port on this mux connection. */
    abstract open(remote_path: string, options: OpenSerialPortOptions): void;

    /** Close a remote port on this mux connection. */
    abstract close(remote_path: string): void;

    /* ---- remote physical-port control (RPC) ---- */

    /** Set modem control lines / break on a remote *physical* port. */
    abstract set_remote(remote_path: string, options: SetOptions): void;
    /** Update a remote *physical* port, e.g. `baudRate`. */
    abstract update_remote(remote_path: string, options: UpdateOptions): void;
    /** Flush a remote *physical* port's buffers. */
    abstract flush_remote(remote_path: string): void;
    /** Read a remote *physical* port's status (CTS / DSR / DCD). */
    abstract get_remote_status(remote_path: string): Promise<PortStatus>;
    /** List the serial ports available on the server host (`SerialPort.list()`). */
    abstract list_ports(): Promise<PortInfo[]>;

    /**
     * Map a remote port (already opened, or to be opened) to a local virtual serial port.
     * @param remote_path - the remote serial port path on the server host
     * @param local_path - local serialport path the app will use (also the mock-binding registry key)
     * @param opt - mock create-port options (`echo` is forced on)
     */
    abstract create_port(remote_path: string, local_path: string, opt?: CreatePortOptions): AbsRemoteSerialportClientPortInstance;

    /** Disconnect this mux socket and release all its local virtual ports / listeners. */
    abstract disconnect(close?: boolean): void;
}

/**
 * Top-level client: holds one socket.io `Manager` (one transport connection) and creates
 * {@link AbsRemoteSerialportClientSocket} / {@link AbsRemoteSerialportClientMuxSocket} over it.
 *
 * Multiple `connect()` / `mux()` calls reuse the same transport (socket.io namespace multiplexing),
 * so one TCP/WS connection can carry many remote serial ports.
 */
export abstract class AbsRemoteSerialportClient {

    /** Shared socket.io client manager (one underlying transport connection). */
    protected abstract readonly client_manager: Manager;

    /** Regexp used to validate namespaces (and, in strict mode, remote serial paths). */
    protected abstract readonly serialport_check_regexp: RegExp | string;

    /** Active namespace-mode sockets, keyed by namespace. */
    protected abstract _sockets: Map<string, AbsRemoteSerialportClientSocket>;

    /** Active mux-mode sockets, keyed by mux namespace. */
    protected abstract _mux_sockets: Map<string, AbsRemoteSerialportClientMuxSocket>;

    /**
     * Connect to a remote serial port (namespace mode) and open it automatically using `options`.
     * @param namespace - socket.io namespace, e.g. `/dev/ttyUSB0` or `/COM5`
     * @param options - serial port open options; `options.path` is the real remote path (defaults to the namespace)
     */
    abstract connect(namespace: string, options: OpenSerialPortOptions): AbsRemoteSerialportClientSocket;
    /**
     * Connect to a remote serial port (namespace mode) without opening it yet.
     * Call {@link AbsRemoteSerialportClientSocket.open} later to open it.
     * @param namespace - socket.io namespace, e.g. `/dev/ttyUSB0` or `/COM5`
     */
    abstract connect(namespace: string): AbsRemoteSerialportClientSocket;

    /**
     * Open (or reuse) a mux connection on the given mux namespace, then address remote ports
     * dynamically via {@link AbsRemoteSerialportClientMuxSocket.open}.
     * @param namespace - mux namespace (default `/`); may be chosen dynamically, e.g. `/site-A`
     */
    abstract mux(namespace?: string): AbsRemoteSerialportClientMuxSocket;

    /**
     * Disconnect one namespace's socket, or (no argument) disconnect everything and close the transport.
     */
    abstract disconnect(namespace?: string): void;
}
