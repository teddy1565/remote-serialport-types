import { ServerOptions, Server, Namespace, Socket } from "socket.io";

import { SocketServerSideEmitChannel, SocketServerSideEmitPayloadCode } from "./index";

export abstract class AbsRemoteSerialServerSocket {
    protected abstract _socket: Socket;

    abstract emit(channel: SocketServerSideEmitChannel, message: SocketServerSideEmitPayloadCode | Buffer | ArrayBuffer | Array<number>): void;
}

export abstract class AbsRemoteSerialServerSocketNamespace<T extends AbsRemoteSerialServerSocket> {
    protected abstract _namespace: Namespace;

    abstract on(channel: SocketServerSideEmitChannel, listener: (socket: T) => void): void;
}



export abstract class AbsRemoteSerialServer<T extends AbsRemoteSerialServerSocket, U extends AbsRemoteSerialServerSocketNamespace<T>> {
    protected abstract SERIALPORT_NAMESPACE_REGEXP: RegExp | string;
    protected abstract SERVER_PORT: number;
    protected abstract io: Server;

    protected abstract create_remote_serial_server_socket_port(socket: Socket): T;

    protected abstract create_remote_serial_server_socket_namespace(namespace: Namespace): U;

    protected socket_map: Map<string, T> = new Map();

    public listen(serverport: number = this.SERVER_PORT): void {
        this.io.listen(serverport);
    }

    public of(namespace: string | RegExp): U {

        const namespaceInstance = this.io.of(namespace);
        return this.create_remote_serial_server_socket_namespace(namespaceInstance);
    }
}
