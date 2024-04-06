
import { OpenSerialPortOptions } from "./serialport";

export type SocketIONamespaceOnEvent = "connection"
| "disconnect"
| "error";

/**
 * Server-side emit to client-side
 *
 * serialport_event indicates an event from the serial port, like `open`, `close`, `error`, `waiting`, etc.
 */
export type SocketServerSideEmitChannel_SerialPortEvent = "serialport_event";

/**
 * Server-side emit to client-side
 *
 * serialport_action indicates an action from the server, like `handshake`, etc.
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

/**
 * Server-side emit to client-side
 *
 * serialport_handshake indicates the handshake from the server-side to the client-side.
 *
 * Infact, it just tells the client-side that the server-side is ready to handle the client-side.
 */
export type SocketServerSideEmitChannel_SerialPortHandshake = "serialport_handshake";

/**
 * Server-side emit to client-side
 *
 * serialport_init_result indicates the result of the serial port initialization.
 *
 * e.g. when client-side connect to the server-side, the server-side will emit this channel to indicate the initialization result.
 */
export type SocketServerSideEmitChannel_SerialPortInitResult = "serialport_init_result";


export type SocketServerSideEmitChannel = SocketServerSideEmitChannel_SerialPortEvent
| SocketServerSideEmitChannel_SerialPortAction
| SocketServerSideEmitChannel_SerialPortResult
| SocketServerSideEmitChannel_SerialPortPacket
| SocketServerSideEmitChannel_SerialPortInitResult
|SocketServerSideEmitChannel_SerialPortHandshake;


export interface SocketServerSideEmitPayload_SerialPort_NotFound {
    code: "serialport_not_found";
    message: string;
}

export interface SocketServerSideEmitPayload_SerialPort_Open {
    code: "serialport_open";
    message: string;
}

export interface SocketServerSideEmitPayload_SerialPort_Close {
    code: "serialport_close";
    message: string;
}

export type SocketServerSideEmitPayload_SerialPort_Packet = Buffer | Array<number>;

export interface SocketServerSideEmitPayload_SerialPort_Error {
    code: "serialport_error";
    message: string;
}

export interface SocketServerSideEmitPayload_SerialPort_Found {
    code: "serialport_found";
    message: string;
}

export interface SocketServerSideEmitPayload_RemoteSerialServerHandshake {
    code: "handshake";
    /**
     * The Server-side ready handle client-side
     */
    data: boolean;

    /**
     * Message for handshake details
     */
    message?: string;
}

export interface SocketServerSideEmitPayload_SerialPort_InitResult {
    code: "serialport_init_result";

    /**
     * If serial port initialization is successful, it will be `true`. Otherwise, it will be `false`.
     */
    data: boolean;

    /**
     * Message for initialization details
     */
    message?: string;
}


export type SocketServerSideEmitPayload = SocketServerSideEmitPayload_SerialPort_NotFound
| SocketServerSideEmitPayload_SerialPort_Open
| SocketServerSideEmitPayload_SerialPort_Close
| SocketServerSideEmitPayload_SerialPort_Packet
| SocketServerSideEmitPayload_SerialPort_Error
| SocketServerSideEmitPayload_SerialPort_Found
| SocketServerSideEmitPayload_RemoteSerialServerHandshake
| SocketServerSideEmitPayload_SerialPort_InitResult;

export type SocketClientSideEmitChannel_SerialPortAction_Open = "serialport_open";
export type SocketClientSideEmitChannel_SerialPortAction_Close = "serialport_close";
export type SocketClientSideEmitChannel_SerialPortAction_SendPacket = "serialport_send_packet";
export type SocketClientSideEmitChannel_SerialPort_Handshake = "serialport_handshake";

export type SocketClientSideEmitChannel = SocketClientSideEmitChannel_SerialPortAction_Open
| SocketClientSideEmitChannel_SerialPortAction_Close
| SocketClientSideEmitChannel_SerialPortAction_SendPacket
| SocketClientSideEmitChannel_SerialPort_Handshake;

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

export interface SocketClientSideEmitPayload_SerialPort_Handshake {
    code: "serialport_handshake";
    data: OpenSerialPortOptions;
}

/**
 * Client-side emit to server-side
 *
 * Server-side should listen SocketClientSideEmitChannel and handle payload type according to the channel.
 */
export type SocketClientSideEmitPayload = SocketClientSideEmitPayload_SerialPort_Open
| SocketClientSideEmitPayload_SerialPort_Close
| SocketClientSideEmitPayload_SerialPort_SendPacket
| SocketClientSideEmitPayload_SerialPort_Handshake;
