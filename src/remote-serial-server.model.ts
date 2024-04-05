import { ServerOptions, Server, Namespace, Socket } from "socket.io";

import { SocketServerSideEmitChannel,
    SocketServerSideEmitPayload,
    SocketClientSideEmitChannel,
    SocketIONamespaceOnEvent,
    SocketClientSideEmitPayload } from "./index";

export abstract class AbsRemoteSerialServerSocket {
    protected abstract _socket: Socket;

    /**
     * Emits an event.
     *
     * @param channel Name of the channel
     * @param message Values to send to listeners of this event
     */
    abstract emit(channel: SocketServerSideEmitChannel, message: SocketServerSideEmitPayload): void;
    /**
     * Adds the `listener` function as an event listener for `channel`.
     *
     * @param channel Name of the channel
     * @param listener Callback function
     */
    abstract on(channel: SocketClientSideEmitChannel, listener: (data: SocketClientSideEmitPayload) => void): void;
    /**
     * Adds a one-time `listener` function as an event listener for `channel`.
     *
     * @param channel Name of the channel
     * @param listener Callback function
     */
    abstract once(channel: SocketClientSideEmitChannel, listener: (data: SocketClientSideEmitPayload) => void): void;
    /**
     * Disconnects this client.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // disconnect this socket (the connection might be kept alive for other namespaces)
     *   socket.disconnect();
     *
     *   // disconnect this socket and close the underlying connection
     *   socket.disconnect(true);
     * })
     *
     * @param {Boolean} close - if `true`, closes the underlying connection
     * @return self
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
     * Get the serial port path, Use Default filter regex
     */
    get serialport_path(): string {
        return this.get_serial_path();
    }

    /**
     * Get the serial port path, Because socket.io namespace rule
     *
     * On Windows, the serial port path is like `COM1`, `COM2`, etc.
     *
     * On Linux, the serial port path is like `/dev/ttyUSB0`, `/dev/ttyUSB1`, etc.
     *
     * but the socket.io namespace rule is like `/COM1`, `/COM2`, etc.
     *
     * so we need to convert the serial port path to the socket.io namespace rule
     * @param filter_regex - regular expression to filter the serial port path
     */
    public get_serial_path(filter_regex: string | RegExp = /^(\/COM)[0-9]+$/): string {
        /**
         * socket.io connection namespace equals to the serial port path
         */
        const origin_namespace = this._socket.nsp.name;

        if (origin_namespace.match(filter_regex) !== null) {
            return origin_namespace.replace("/", "");
        }

        return origin_namespace;
    }
}

export abstract class AbsRemoteSerialServerSocketNamespace<T extends AbsRemoteSerialServerSocket> {
    protected abstract _namespace: Namespace;

    /**
     * Adds the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the ev
     * @param listener Callback function
     */
    abstract on(ev: SocketIONamespaceOnEvent, listener: (socket: T) => void): void;
}



export abstract class AbsRemoteSerialServer<T extends AbsRemoteSerialServerSocket, U extends AbsRemoteSerialServerSocketNamespace<T>> {
    protected abstract SERIALPORT_NAMESPACE_REGEXP: RegExp | string;
    protected abstract SERVER_PORT: number;
    protected abstract io: Server;

    /**
     * Create a new remote serial server socket instance
     * @param socket - socket.io socket instance
     */
    protected abstract create_remote_serial_server_socket_port(socket: Socket): T;

    /**
     * Create a new remote serial server socket namespace instance
     *
     * When implementing this method, becareful if a same socket.id want access same serial port.
     *
     * That means, a same socket.id accesse same serial port. You should return the same instance.
     * @param namespace - socket.io namespace instance
     */
    protected abstract create_remote_serial_server_socket_namespace(namespace: Namespace): U;

    /**
     * Listen for incoming connections on the server
     * @param serverport - server port number
     */
    public listen(serverport: number = this.SERVER_PORT): void {
        this.io.listen(serverport);
    }

    /**
     * Create a new remote serial server socket instance, Namespace is unique. If there are duplicate namespaces, only the first one will be the main one.
     * @param namespace - namespace to listen for incoming connections
     * @returns remote serial server socket namespace instance
     */
    public of(namespace: string | RegExp = this.SERIALPORT_NAMESPACE_REGEXP): U {

        const namespaceInstance = this.io.of(namespace);
        return this.create_remote_serial_server_socket_namespace(namespaceInstance);
    }
}
