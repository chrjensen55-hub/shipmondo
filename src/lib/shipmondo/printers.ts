import 'server-only'
import { ShipmondoClient } from './client'
import type { ShipmondoPrinter } from './types'

type RawPrinter = { name: string; host_name: string; printer: string; label_format: string }

export async function listPrinters(): Promise<ShipmondoPrinter[]> {
  if (process.env.SHIPMONDO_MOCK_MODE === 'true') return []
  const client = new ShipmondoClient()
  if (!client.isConfigured()) throw new Error('Printer lookup requires configured Shipmondo credentials')
  const raw = await client.get<RawPrinter[]>('/printers')
  return raw.map((p) => ({ name: p.name, hostName: p.host_name, printerName: p.printer, labelFormat: p.label_format }))
}
