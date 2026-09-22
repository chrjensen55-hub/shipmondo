// Minimal ambient types for the subset of the Web Bluetooth API this app uses to talk directly
// to the Zebra printer's "Zebra Bluetooth LE Parser Service" (see lib/zebraBluetooth.ts).
// TypeScript's standard DOM lib doesn't include Web Bluetooth, and pulling in a full third-party
// types package for this handful of calls isn't worth the dependency.
export {}

declare global {
  interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>
    writeValueWithResponse?(value: BufferSource): Promise<void>
    writeValueWithoutResponse?(value: BufferSource): Promise<void>
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean
    connect(): Promise<BluetoothRemoteGATTServer>
    disconnect(): void
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
  }

  interface BluetoothDevice {
    id: string
    name?: string
    gatt?: BluetoothRemoteGATTServer
  }

  interface RequestDeviceOptions {
    filters?: { services?: string[]; name?: string; namePrefix?: string }[]
    optionalServices?: string[]
    acceptAllDevices?: boolean
  }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
    getDevices?(): Promise<BluetoothDevice[]>
  }

  interface Navigator {
    bluetooth?: Bluetooth
  }
}
