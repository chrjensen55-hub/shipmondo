import { useCallback, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { BackHandler, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CircleCheck } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { PrintProgressBar } from '@/components/PrintProgressBar'
import { useWizard } from '@/lib/wizard-context'
import { api, ApiError } from '@/lib/api'
import { printZplViaBluetooth } from '@/lib/zebraBluetooth'
import { colors, radius } from '@/lib/theme'

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

export default function Confirmation() {
  const router = useRouter()
  const { reset } = useWizard()
  const { reference, tracking, shipmentId, customerPrice } = useLocalSearchParams<{ reference: string; tracking: string; shipmentId: string; customerPrice: string }>()
  const [printing, setPrinting] = useState(false)
  const [printProgress, setPrintProgress] = useState(0)
  const [printed, setPrinted] = useState(false)
  const [error, setError] = useState('')
  const [hasClickedPrint, setHasClickedPrint] = useState(false)

  async function printLabel() {
    if (printing) return
    if (!shipmentId) {
      setError('The label is not available for this shipment.')
      return
    }
    setHasClickedPrint(true)
    setPrinting(true)
    setPrintProgress(0)
    setError('')
    setPrinted(false)
    try {
      const labels = await api<{ base64: string; file_format: string }[]>(`/api/shipments/${shipmentId}/labels?format=zpl`)
      const label = labels[0]
      if (!label) throw new Error('No label available for this shipment.')
      await printZplViaBluetooth(base64ToUtf8(label.base64), setPrintProgress)
      setPrinted(true)
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not print this label.')
    } finally {
      setPrinting(false)
    }
  }

  function done() {
    reset()
    router.replace('/send')
  }

  // Booking already succeeded by the time this screen shows - letting the hardware back button
  // return into the wizard (review/customs/etc, still holding the same draft) would let someone
  // press "Confirm and create shipment" again, generating a fresh idempotency key and creating a
  // genuine duplicate shipment. Treat back the same as Done instead of allowing it to navigate.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        done()
        return true
      })
      return () => sub.remove()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <CircleCheck color={colors.success} size={56} />
        <Text style={styles.title}>You&apos;re all set</Text>
        <Text style={styles.subtitle}>The shipment is booked and ready.</Text>
        <View style={styles.card}>
          <Row label="Reference" value={reference} />
          <Row label="Tracking number" value={tracking} />
          <Row label="Total" value={`${customerPrice} DKK`} />
        </View>
        <View style={styles.printHero}>
          {printing ? <PrintProgressBar progress={printProgress} /> : <Button label="Print label" onPress={printLabel} />}
          {printed && <Text style={styles.success}>The label was sent to the printer.</Text>}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        {hasClickedPrint && (
          <View style={styles.doneWrap}>
            <Button label="Done" variant="secondary" onPress={done} />
          </View>
        )}
      </View>
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
  content: { flex: 1, padding: 24, alignItems: 'center', gap: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.muted },
  rowValue: { fontWeight: '700', color: colors.ink },
  printHero: { width: '100%', maxWidth: 380, alignItems: 'center', gap: 10, marginTop: 20 },
  success: { color: colors.success },
  error: { color: colors.error, textAlign: 'center' },
  doneWrap: { marginTop: 60, width: '100%', maxWidth: 380, alignItems: 'center' },
})
