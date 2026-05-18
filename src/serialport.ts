import { SerialPortOpenOptions } from "serialport";
import { DarwinBindingInterface, LinuxBindingInterface, WindowsBindingInterface } from "@serialport/bindings-cpp";
import { SetOptions, UpdateOptions, PortStatus, PortInfo } from "@serialport/bindings-interface";

export type AutoDetectTypes = DarwinBindingInterface | WindowsBindingInterface | LinuxBindingInterface;
export type OpenSerialPortOptions = SerialPortOpenOptions<AutoDetectTypes>;

/**
 * Re-exported `@serialport/bindings-interface` types used by the remote-control RPCs
 * (`set` / `get` / `update` / `list`).
 */
export { SetOptions, UpdateOptions, PortStatus, PortInfo };

/**
 * Minimal interface the server side relies on for a *physical* serial port instance.
 *
 * Both `SerialPort` (real) and `SerialPortMock` (test) satisfy it structurally, because both extend
 * `SerialPortStream`. Used so the actual port implementation can be injected — e.g. a mock-backed
 * factory in tests, instead of `new SerialPort(...)` which needs a real OS port.
 *
 * Kept deliberately permissive so concrete `serialport` classes assign to it without friction.
 */
export interface SerialPortLike {
    readonly path: string;
    readonly isOpen: boolean;
    open(callback?: (error?: Error | null) => void): void;
    close(callback?: (error?: Error | null) => void): void;
    write(data: any, callback?: (error?: Error | null) => void): boolean;
    destroy(error?: Error): void;
    set(options: SetOptions, callback?: (error?: Error | null) => void): void;
    get(callback?: (error: Error | null, status?: PortStatus) => void): void;
    update(options: UpdateOptions, callback?: (error?: Error | null) => void): void;
    flush(callback?: (error?: Error | null) => void): void;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
}

/**
 * Factory for creating a physical serial port instance.
 *
 * Default on the server: `(options) => new SerialPort(options)`.
 * Inject a mock-backed factory in tests, e.g. `(options) => new SerialPortMock(options)`.
 */
export type SerialPortFactory = (options: OpenSerialPortOptions) => SerialPortLike;

/**
 * Provider for "list the serial ports available on the server host" (`SerialPort.list()`).
 *
 * Default on the server: `() => SerialPort.list()`. Inject a custom one in tests.
 */
export type SerialPortListProvider = () => Promise<PortInfo[]>;
