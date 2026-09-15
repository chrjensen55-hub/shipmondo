// Minimal ambient types for the Web Bluetooth API (not part of TypeScript's bundled DOM lib).
// Only covers what src/lib/zebraBle.ts actually uses.
interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>
  writeValueWithoutResponse?(value: BufferSource): Promise<void>
  writeValueWithResponse?(value: BufferSource): Promise<void>
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

interface BluetoothRequestDeviceFilter {
  services?: string[]
  name?: string
  namePrefix?: string
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[]
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
