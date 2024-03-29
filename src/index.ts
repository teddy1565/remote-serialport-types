

export type SocketIONamespaceOnEvent = "connection"
| "disconnect"
| "error";


export type SocketServerSideEmitChannel = "serialport_event"
| "serialport_action"
| "serialport_result"
| "serialport_packet";

export type SocketServerSideEmitPayloadCode = "serialport_not_found"
| "serialport_open"
| "serialport_close"
| "serialport_packet"
| "serialport_error"
| "serialport_found";

export type SocketServerSideEmitPayloadType = SocketServerSideEmitPayloadCode | Buffer | ArrayBuffer | Array<number>;


export type SocketClientSideEmitChannel = "open_serialport"
| "send_serialport_packet"
| "close_serialport";


export type SocketClientSideEmitPayloadCode = "serialport_open";

export type SocketClientSideEmitPayloadType = SocketClientSideEmitPayloadCode | Buffer | ArrayBuffer | Array<number>;
