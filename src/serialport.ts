import { SerialPortOpenOptions } from "serialport";
import { DarwinBindingInterface, LinuxBindingInterface, WindowsBindingInterface } from "@serialport/bindings-cpp";

export type AutoDetectTypes = DarwinBindingInterface | WindowsBindingInterface | LinuxBindingInterface;
export type OpenSerialPortOptions = SerialPortOpenOptions<AutoDetectTypes>;
