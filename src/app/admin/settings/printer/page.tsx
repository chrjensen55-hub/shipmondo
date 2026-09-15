'use client'
import { useEffect, useState } from 'react'
import { Printer, Bluetooth, BluetoothConnected, Usb } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { getDefaultPrinter, type BrowserPrintDevice } from '@/lib/browserPrint'
import { isWebBluetoothSupported, getGrantedDevices, getSelectedDeviceId, selectDevice, pairZebraPrinter, hasCachedZebraPrinter, getCachedDeviceName } from '@/lib/zebraBle'
import { isWebUsbSupported, getGrantedUsbDevices, pairZebraPrinterUsb, hasCachedUsbPrinter, getCachedUsbDeviceName } from '@/lib/zebraUsb'
export const dynamic = 'force-dynamic'

type ConnectionState = { status: 'idle' | 'checking' | 'ok' | 'error'; message?: string; accountName?: string }
type PrinterOption = { name: string; hostName: string; printerName: string; labelFormat: string }
type BrowserPrintState = { status: 'idle' | 'checking' | 'ok' | 'error'; device?: BrowserPrintDevice; message?: string }
type BleState = { status: 'idle' | 'checking' | 'ready' | 'error'; devices: BluetoothDevice[]; selectedId: string | null; message?: string }
type UsbState = { status: 'idle' | 'checking' | 'ready' | 'error'; devices: USBDevice[]; message?: string }

export default function PrinterSettings() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'checking' })
  const [printers, setPrinters] = useState<PrinterOption[]>([])
  const [labelFormat, setLabelFormat] = useState('ZPL')
  const [browserPrint, setBrowserPrint] = useState<BrowserPrintState>({ status: 'idle' })
  const [ble, setBle] = useState<BleState>({ status: 'idle', devices: [], selectedId: null })
  const [usb, setUsb] = useState<UsbState>({ status: 'idle', devices: [] })

  async function refreshBleDevices() {
    const granted = await getGrantedDevices()
    setBle((s) => ({ ...s, status: 'ready', devices: granted, selectedId: getSelectedDeviceId() }))
  }

  async function refreshUsbDevices() {
    const granted = await getGrantedUsbDevices()
    setUsb((s) => ({ ...s, status: 'ready', devices: granted }))
  }

  async function pairUsb() {
    setUsb((s) => ({ ...s, status: 'checking', message: undefined }))
    try {
      await pairZebraPrinterUsb()
      await refreshUsbDevices()
    } catch (err) {
      setUsb((s) => ({ ...s, status: 'error', message: err instanceof Error && err.message ? err.message : 'Could not pair. Plug the printer into the tablet with a USB-C cable and make sure it is powered on.' }))
    }
  }

  async function testBrowserPrint() {
    setBrowserPrint({ status: 'checking' })
    try {
      const device = await getDefaultPrinter()
      if (!device) throw new Error('Browser Print is running, but no default printer is set. Open the Browser Print app on this tablet and set the Zebra printer as default.')
      setBrowserPrint({ status: 'ok', device })
    } catch {
      setBrowserPrint({ status: 'error', message: 'Could not reach Zebra Browser Print on this device. Make sure the Browser Print app is installed and running, and the Zebra printer is paired.' })
    }
  }

  async function pairBle() {
    setBle((s) => ({ ...s, status: 'checking', message: undefined }))
    try {
      await pairZebraPrinter()
      await refreshBleDevices()
    } catch (err) {
      setBle((s) => ({ ...s, status: 'error', message: err instanceof Error && err.message ? err.message : 'Could not pair. Make sure Bluetooth is on and the printer is nearby.' }))
    }
  }

  function chooseBleDevice(id: string) {
    const device = ble.devices.find((d) => d.id === id)
    if (!device) return
    selectDevice(device)
    setBle((s) => ({ ...s, selectedId: id }))
  }

  async function checkConnection() {
    try {
      const res = await fetch('/api/shipmondo/test-connection', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error?.message ?? 'Connection failed')
      setConnection({ status: 'ok', accountName: body.data.accountName })
    } catch (err) {
      setConnection({ status: 'error', message: err instanceof Error ? err.message : 'Connection failed' })
    }
  }

  function retryConnection() {
    setConnection({ status: 'checking' })
    checkConnection()
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      checkConnection()
      fetch('/api/shipmondo/printers').then((r) => r.json()).then((body) => setPrinters(body.data ?? [])).catch(() => {})
      if (isWebBluetoothSupported()) refreshBleDevices()
      if (isWebUsbSupported()) refreshUsbDevices()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const heading = connection.status === 'ok' ? `Connected to ${connection.accountName}` : connection.status === 'checking' ? 'Checking Shipmondo connection…' : connection.status === 'error' ? 'Connection failed' : 'No printer connected'

  return (
    <AdminShell title="Printer settings" subtitle="Connect Shipmondo Print Client and a label printer" active="Printers" live={connection.status === 'ok'}>
      <div className="admin-content">
        <section className="setup-card">
          <Printer />
          <h2>{heading}</h2>
          <p>{connection.status === 'error' ? connection.message : 'Add Shipmondo server credentials, install Shipmondo Print Client on the store computer, then select the configured Zebra printer here.'}</p>
          <div className="fields two">
            <label className="field">
              <span>Label format</span>
              <select value={labelFormat} onChange={(e) => setLabelFormat(e.target.value)}>
                <option>ZPL</option>
                <option>PDF</option>
              </select>
            </label>
            <label className="field">
              <span>Printer</span>
              <select disabled={printers.length === 0}>
                {printers.length === 0 ? <option>Install Shipmondo Print Client to load printers</option> : printers.map((p) => <option key={p.name}>{p.name} ({p.hostName})</option>)}
              </select>
            </label>
          </div>
          <button className="button button-primary" onClick={retryConnection} disabled={connection.status === 'checking'}>{connection.status === 'checking' ? 'Testing…' : 'Test connection'}</button>
        </section>
        <section className="setup-card">
          <Bluetooth />
          <h2>Zebra Browser Print (this tablet, recommended)</h2>
          <p>
            The primary way this tablet prints: install the &quot;Zebra Browser Print&quot; app from the Play Store, pair the printer with the tablet over Bluetooth, then open Browser Print and set it as the default printer.
            Once that&apos;s done, tapping &quot;Print label&quot; in the booking wizard sends the label straight to the printer automatically &mdash; nothing else to configure here.
          </p>
          {browserPrint.status === 'ok' && browserPrint.device && (
            <div className="form-success">Connected to {browserPrint.device.name} ({browserPrint.device.connection || 'unknown connection'})</div>
          )}
          {browserPrint.status === 'error' && <div className="form-error">{browserPrint.message}</div>}
          <button className="button button-primary" onClick={testBrowserPrint} disabled={browserPrint.status === 'checking'}>{browserPrint.status === 'checking' ? 'Testing…' : 'Test Zebra Browser Print'}</button>
        </section>
        <section className="setup-card">
          <Usb />
          <h2>Zebra printer over USB (fallback)</h2>
          <p>
            Only used automatically if Browser Print above isn&apos;t available. Plug the printer into this tablet with a USB-C cable and print directly over the wire.
            Pairing lasts for as long as this browser tab stays open, plus it&apos;s remembered across page reloads and app restarts.
          </p>
          {!isWebUsbSupported() && <div className="form-error">This browser does not support WebUSB. Use Chrome on this tablet.</div>}
          {usb.status === 'error' && <div className="form-error">{usb.message}</div>}
          {hasCachedUsbPrinter() ? (
            <div className="form-success">Ready to print to {getCachedUsbDeviceName() || 'the paired printer'} over USB.</div>
          ) : usb.devices.length > 0 ? (
            <div className="form-success">Previously granted: {usb.devices.map((d) => d.productName || 'Zebra printer').join(', ')}. It will connect automatically next time you print.</div>
          ) : (
            usb.status === 'ready' && <p>Not paired yet &mdash; plug in the printer and tap the button below.</p>
          )}
          <button className="button button-primary" onClick={pairUsb} disabled={usb.status === 'checking' || !isWebUsbSupported()}>{usb.status === 'checking' ? 'Waiting for you to pick a device…' : 'Pair Zebra printer over USB'}</button>
        </section>
        <section className="setup-card">
          <BluetoothConnected />
          <h2>Zebra printer over Bluetooth LE (fallback)</h2>
          <p>
            Only used automatically if both Browser Print and USB above aren&apos;t available. Talks directly to the printer&apos;s Bluetooth radio with no extra app, for printers without Bluetooth Classic or Wi-Fi.
            Pairing lasts for as long as this browser tab stays open &mdash; which on a shop tablet is normally all day &mdash; so pair once here each morning (or after the tablet restarts) and customers won&apos;t see this prompt.
          </p>
          {!isWebBluetoothSupported() && <div className="form-error">This browser does not support Web Bluetooth. Use Chrome on this tablet.</div>}
          {ble.status === 'error' && <div className="form-error">{ble.message}</div>}
          {hasCachedZebraPrinter() ? (
            <div className="form-success">Ready to print to {getCachedDeviceName() || 'the paired printer'} for the rest of this session.</div>
          ) : (
            ble.status === 'ready' && <p>Not paired yet in this browser session &mdash; tap the button below.</p>
          )}
          {ble.devices.length > 0 && (
            <>
              <p>Devices this tablet has been granted access to before (survives closing this page, but not always a full browser restart):</p>
              <ul className="device-list">
                {ble.devices.map((d) => (
                  <li key={d.id} className={d.id === ble.selectedId ? 'selected' : ''}>
                    <span>{d.name || 'Unnamed device'}</span>
                    {d.id === ble.selectedId ? <b>In use for printing</b> : <button className="button button-secondary" onClick={() => chooseBleDevice(d.id)}>Use this printer</button>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button className="button button-primary" onClick={pairBle} disabled={ble.status === 'checking' || !isWebBluetoothSupported()}>{ble.status === 'checking' ? 'Waiting for you to pick a device…' : 'Pair Zebra printer'}</button>
        </section>
      </div>
    </AdminShell>
  )
}
