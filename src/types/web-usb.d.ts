// Minimal ambient types for the WebUSB API (not part of TypeScript's bundled DOM lib).
// Only covers what src/lib/zebraUsb.ts actually uses.
interface USBEndpoint {
  endpointNumber: number
  direction: 'in' | 'out'
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[]
}

interface USBInterface {
  interfaceNumber: number
  claimed: boolean
  alternate: USBAlternateInterface
}

interface USBConfiguration {
  interfaces: USBInterface[]
}

interface USBDevice {
  vendorId: number
  productId: number
  productName?: string
  opened: boolean
  configuration: USBConfiguration | null
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: BufferSource): Promise<{ status: 'ok' | 'stall' | 'babble'; bytesWritten: number }>
}

interface USBDeviceFilter {
  vendorId?: number
  productId?: number
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[]
}

interface USB {
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
  getDevices(): Promise<USBDevice[]>
}

interface Navigator {
  usb?: USB
}
