import { Manager, Socket } from "socket.io-client";

import { OpenSerialPortOptions } from "./serialport";

import { BindingInterface } from "@serialport/bindings-interface";
import { SerialPortStream, OpenOptions } from "@serialport/stream";

import { MockBindingInterface, CreatePortOptions } from "@serialport/binding-mock";

import { SocketServerSideEmitChannel,
    SocketServerSideEmitPayload,
    SocketClientSideEmitChannel,
    SocketIONamespaceOnEvent,
    SocketClientSideEmitPayload_SerialPort_SendPacket,
    SocketClientSideEmitPayload } from "./index";

export interface OpenOptoinsForSerialPortStream extends Partial<OpenOptions> {
    path?: string;
    baudRate: number;
}

/**
 * a package that encapsulation a serial port stream instance
 */
export abstract class AbsRemoteSerialportClientPortInstance {

    protected abstract mock_binding: MockBindingInterface;

    protected abstract port_path: string;

    constructor() {

    }

    public abstract get_port(open_options: OpenOptoinsForSerialPortStream): SerialPortStream;
}

export abstract class AbsRemoteSerialportClientSocket {
    protected abstract _socket: Socket;

    protected abstract _open_options: OpenSerialPortOptions;

    /**
     * Send Write Packet to Server-Side
     * @param channel
     * @param message
     */
    abstract emit(channel: Extract<SocketClientSideEmitChannel, "serialport_send_packet">, message: SocketClientSideEmitPayload_SerialPort_SendPacket): void;
    /**
     * Send Message to Server-Side
     * @param channel
     * @param message
     */
    abstract emit(channel: SocketClientSideEmitChannel, message: SocketClientSideEmitPayload): void;

    /**
     * Handle Server-Side Emit Event
     * @param channel
     * @param listener
     */
    abstract on(channel: SocketServerSideEmitChannel, listener: (data: SocketServerSideEmitPayload) => void): void;

    /**
     * Handle Server-Side Emit Event Once
     * @param channel
     * @param listener
     */
    abstract once(channel: SocketServerSideEmitChannel, listener: (data: SocketServerSideEmitPayload) => void): void;

    /**
     * Disconnect the client
     * @param close
     */
    abstract disconnect(close?: boolean): void;

    /**
     * Create A Serial Port Mock Binding
     * @param path - Specify a local serialport path, The remote serialport data will mapping to this path
     * @param opt - Create Port Options
     */
    abstract create_port(path: string, opt?: CreatePortOptions): AbsRemoteSerialportClientPortInstance;
}


export abstract class AbsRemoteSerialportClient {


    /**
     * Socket.io Client Manager
     */
    protected readonly client_manager: Manager;

    /**
     * Serial Port Check RegExp
     */
    protected readonly serialport_check_regexp: RegExp | string;

    /**
     * RemoteSerialportClientSocket Instance
     */
    protected abstract _socket: AbsRemoteSerialportClientSocket | null;


    /**
     * Abstract Remote Serialport Client
     * @param server_host - Server Host, Example: ws://localhost:17991
     */
    constructor(server_host: string, serialport_check_regexp: RegExp | string = /^(\/dev\/tty(USB|AMA|ACM)|\/COM)[0-9]+$/) {
        this.client_manager = new Manager(server_host);
        this.serialport_check_regexp = serialport_check_regexp;
    }

    /**
     * Open Serialport Path, namespace serial path will override open_options path
     * @param namesapce - The namespace of the server, Example: /dev/ttyUSB0 or COM1...
     * @param open_options - Serial Port Open Options, the path will be ignored
     * @returns - return RemoteSerialportClientSocket Instance
     */
    abstract connect(namesapce: string, open_options: OpenSerialPortOptions): AbsRemoteSerialportClientSocket;

    abstract disconnect(): void;
}
