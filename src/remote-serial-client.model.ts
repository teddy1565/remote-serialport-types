import { Manager, Socket } from "socket.io-client";

import { OpenSerialPortOptions } from "./serialport";

import { SocketServerSideEmitChannel,
    SocketServerSideEmitPayload,
    SocketClientSideEmitChannel,
    SocketIONamespaceOnEvent,
    SocketClientSideEmitPayload } from "./index";

export abstract class AbsRemoteSerialportClientSocket {
    protected abstract _socket: Socket;

    protected abstract _open_options: OpenSerialPortOptions;

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
     * Connect to the server
     * @param namesapce - The namespace of the server, Example: /dev/ttyUSB0 or COM1...
     * @param open_options - Serial Port Open Options
     * @returns
     */
    abstract connect(namesapce: string, open_options: OpenSerialPortOptions): AbsRemoteSerialportClientSocket;

    abstract disconnect(): void;

    abstract on(event: SocketServerSideEmitChannel, callback: (data: SocketServerSideEmitPayload) => void): void;

    abstract once(event: SocketServerSideEmitChannel, callback: (data: SocketServerSideEmitPayload) => void): void;
}
