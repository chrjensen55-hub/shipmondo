import 'server-only'
import type { ShipmondoPrinter } from './types'
export async function listPrinters():Promise<ShipmondoPrinter[]>{if(process.env.SHIPMONDO_MOCK_MODE==='true')return[];throw new Error('Printer lookup requires configured Shipmondo credentials')}
