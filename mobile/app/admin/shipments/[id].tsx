import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { api, ApiError } from '@/lib/api'
import { printZplViaBluetooth } from '@/lib/zebraBluetooth'
import type { ShipmondoShipment } from '@/lib/types'
import { colors, radius } from '@/lib/theme'

// atob isn't guaranteed to exist in Hermes; a tiny manual base64 decoder avoids that assumption.
function base64ToUtf8(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = base64.replace(/=+$/, '')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    const val = chars.indexOf(ch)
    if (val === -1) continue
    buffer = (buffer << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i++]
    if (b0 < 0x80) out += String.fromCharCode(b0)
    else if (b0 >> 5 === 0x6) out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f))
    else if (b0 >> 4 === 0xe) out += String.fromCharCode(((b0 & 0xf) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f))
    else i += 3
  }
  return out
}

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [shipment, setShipment] = useState<ShipmondoShipment | null>(null)
  const [loadError, setLoadError] = useState('')
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'ok' | 'error'>('idle')
  const [printMessage, setPrintMessage] = useState('')

  useEffect(() => {
    api<ShipmondoShipment>(`/api/shipmondo/shipments/${id}`)
      .then(setShipment)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load this shipment.'))
  }, [id])

  async function reprint() {
    setPrintStatus('printing')
    setPrintMessage('')
    try {
      const labels = await api<{ base64: string; file_format: string }[]>(`/api/shipments/${id}/labels?format=zpl`)
      const label = labels[0]
      if (!label) throw new Error('No label available for this shipment.')
      await printZplViaBluetooth(base64ToUtf8(label.base64))
      setPrintStatus('ok')
    } catch (err) {
      setPrintStatus('error')
      setPrintMessage(err instanceof ApiError || err instanceof Error ? err.message : 'Could not print this label.')
    }
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.error}>{loadError}</Text>
      </SafeAreaView>
    )
  }
  if (!shipment) return null

  const sender = shipment.parties.find((p) => p.type === 'sender')
  const receiver = shipment.parties.find((p) => p.type === 'receiver')

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{shipment.reference || `#${shipment.id}`}</Text>
        <Text style={styles.subtitle}>{new Date(shipment.created_at).toLocaleString()}</Text>

        <View style={styles.card}>
          <Row label="Carrier" value={`${shipment.carrier_code} ${shipment.description}`} />
          <Row label="Tracking" value={shipment.external_pkg_no || shipment.pkg_no} />
          <Row label="Price" value={`${shipment.price} DKK`} />
          <Row label="Recipient" value={`${receiver?.name ?? ''}\n${receiver?.address1 ?? ''}, ${receiver?.postal_code ?? ''} ${receiver?.city ?? ''}`} />
          <Row label="Sender" value={`${sender?.name ?? ''}\n${sender?.address1 ?? ''}, ${sender?.postal_code ?? ''} ${sender?.city ?? ''}`} />
        </View>

        <Button label={printStatus === 'printing' ? 'Printing…' : 'Reprint label'} onPress={reprint} loading={printStatus === 'printing'} />
        {printStatus === 'ok' && <Text style={styles.success}>Sent to the printer.</Text>}
        {printStatus === 'error' && <Text style={styles.error}>{printMessage}</Text>}
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: -10 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  row: { gap: 2 },
  rowLabel: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  rowValue: { color: colors.ink, fontSize: 15 },
  error: { color: colors.error, textAlign: 'center' },
  success: { color: colors.success, textAlign: 'center' },
})
