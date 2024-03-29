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


export type SocketClientSideEmitChannel = "open_serialport"
| "send_serialport_packet"
| "close_serialport";
