
import { OpenSerialPortOptions } from "./serialport";

export type SocketIONamespaceOnEvent = "connection"
| "disconnect"
| "error";

/**
 * Server-side emit to client-side
 *
 * serialport_event indicates an event from the serial port, like `handshake`, `open`, `close`, `error`, `waiting`, etc.
 */
export type SocketServerSideEmitChannel_SerialPortEvent = "serialport_event";

/**
 * Server-side emit to client-side
 *
 * serialport_action indicates an action from the server, like `open`, `close`, `send`, etc.
 *
 * e.g. If Server-side want control the serial port, it will emit this channel.
 */
export type SocketServerSideEmitChannel_SerialPortAction = "serialport_action";

/**
 * Server-side emit to client-side
 *
 * serialport_result indicates the result of an action from the server.
 *
 * e.g. If Client-side want to Extract and Transmit the serial port data, when the server-side finish the action, it will emit this channel.
 */
export type SocketServerSideEmitChannel_SerialPortResult = "serialport_result";

/**
 * Server-side emit to client-side
 *
 * serialport_packet indicates the serialport buffer packet from the serial port.
 *
 * It is an one-way transmission from server-side to client-side.
 */
export type SocketServerSideEmitChannel_SerialPortPacket = "serialport_packet";


export type SocketServerSideEmitChannel = SocketServerSideEmitChannel_SerialPortEvent
| SocketServerSideEmitChannel_SerialPortAction
| SocketServerSideEmitChannel_SerialPortResult
| SocketServerSideEmitChannel_SerialPortPacket;

export type SocketServerSideEmitPayloadCode_SerialPort_NotFound = "serialport_not_found";
export type SocketServerSideEmitPayloadCode_SerialPort_Open = "serialport_open";
export type SocketServerSideEmitPayloadCode_SerialPort_Close = "serialport_close";
export type SocketServerSideEmitPayloadCode_SerialPort_Packet = "serialport_packet";
export type SocketServerSideEmitPayloadCode_SerialPort_Error = "serialport_error";
export type SocketServerSideEmitPayloadCode_SerialPort_Found = "serialport_found";

export type SocketServerSideEmitPayloadCode = SocketServerSideEmitPayloadCode_SerialPort_NotFound
| SocketServerSideEmitPayloadCode_SerialPort_Open
| SocketServerSideEmitPayloadCode_SerialPort_Close
| SocketServerSideEmitPayloadCode_SerialPort_Packet
| SocketServerSideEmitPayloadCode_SerialPort_Error
| SocketServerSideEmitPayloadCode_SerialPort_Found;

export interface SocketServerSideEmitPayload {
    code: SocketServerSideEmitPayloadCode;
    message: string;
}

export type SocketServerSideEmitPayloadType = SocketServerSideEmitPayload | Buffer | ArrayBuffer | Array<number>;


export type SocketClientSideEmitChannel_SerialPortAction_Open = "serialport_open";
export type SocketClientSideEmitChannel_SerialPortAction_Close = "serialport_close";
export type SocketClientSideEmitChannel_SerialPortAction_SendPacket = "serialport_send_packet";

export type SocketClientSideEmitChannel = SocketClientSideEmitChannel_SerialPortAction_Open
| SocketClientSideEmitChannel_SerialPortAction_Close
| SocketClientSideEmitChannel_SerialPortAction_SendPacket;

export interface SocketClientSideEmitPayload_SerialPort_Open {
    code: "serialport_open";
    data: OpenSerialPortOptions;
}

export interface SocketClientSideEmitPayload_SerialPort_Close {
    code: "serialport_close";

    /**
     * Serialport path (But it will be ignored by the server-side)
     */
    data: string;
}

export interface SocketClientSideEmitPayload_SerialPort_SendPacket {
    code: "serialport_send_packet";
    data: Array<number> | Buffer;
}

/**
 * Client-side emit to server-side
 *
 * Server-side should listen SocketClientSideEmitChannel and handle payload type according to the channel.
 *
 * It Different with SocketServerSidePayload
 */
export type SocketClientSideEmitPayload = SocketClientSideEmitPayload_SerialPort_Open
| SocketClientSideEmitPayload_SerialPort_Close
| SocketClientSideEmitPayload_SerialPort_SendPacket;

export type SocketClientSideEmitPayloadType = SocketClientSideEmitPayload | Buffer | ArrayBuffer | Array<number>;
