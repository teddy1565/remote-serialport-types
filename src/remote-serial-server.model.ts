import { ServerOptions, Server, Namespace, Socket } from "socket.io";

import { SocketServerSideEmitChannel,
    SocketServerSideEmitPayloadCode,
    SocketClientSideEmitChannel,
    SocketIONamespaceOnEvent,
    SocketServerSideEmitPayloadType,
    SocketClientSideEmitPayloadCode,
    SocketClientSideEmitPayloadType } from "./index";

export abstract class AbsRemoteSerialServerSocket {
    protected abstract _socket: Socket;

    abstract emit(channel: SocketServerSideEmitChannel, message: SocketServerSideEmitPayloadType): void;
    abstract on(channel: SocketClientSideEmitChannel, listener: (data: SocketClientSideEmitPayloadType) => void): void;
    abstract once(channel: SocketClientSideEmitChannel, listener: (data: SocketClientSideEmitPayloadType) => void): void;
}

export abstract class AbsRemoteSerialServerSocketNamespace<T extends AbsRemoteSerialServerSocket> {
    protected abstract _namespace: Namespace;

    abstract on(channel: SocketIONamespaceOnEvent, listener: (socket: T) => void): void;
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
     * Create a new remote serial server socket instance
     * @param namespace - namespace to listen for incoming connections
     * @returns remote serial server socket namespace instance
     */
    public of(namespace: string | RegExp): U {

        const namespaceInstance = this.io.of(namespace);
        return this.create_remote_serial_server_socket_namespace(namespaceInstance);
    }
}
