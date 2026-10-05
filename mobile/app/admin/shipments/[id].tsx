import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { PrintProgressBar } from '@/components/PrintProgressBar'
import { api } from '@/lib/api'
import { base64ToUtf8 } from '@/lib/base64'
import { printZplViaBluetooth } from '@/lib/zebraBluetooth'
import type { ShipmondoShipment } from '@/lib/types'

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [shipment, setShipment] = useState<ShipmondoShipment | null>(null)
  const [loadError, setLoadError] = useState('')
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'ok' | 'error'>('idle')
  const [printProgress, setPrintProgress] = useState(0)
  const [printMessage, setPrintMessage] = useState('')

  useEffect(() => {
    api<ShipmondoShipment>(`/api/shipmondo/shipments/${id}`)
      .then(setShipment)
      .catch(() => setLoadError('We could not load this shipment. Please try again.'))
  }, [id])

  async function reprint() {
    if (printStatus === 'printing') return
    setPrintStatus('printing')
    setPrintProgress(0)
    setPrintMessage('')
    try {
      const labels = await api<{ base64: string; file_format: string }[]>(`/api/shipments/${id}/labels?format=zpl`)
      const label = labels[0]
      if (!label) throw new Error('No label available')
      await printZplViaBluetooth(base64ToUtf8(label.base64), setPrintProgress)
      setPrintStatus('ok')
    } catch {
      setPrintStatus('error')
      setPrintMessage('We could not print this label. Check the printer and try again.')
    }
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-cream p-5">
        <Text className="text-center text-base font-medium text-error">{loadError}</Text>
      </SafeAreaView>
    )
  }
  if (!shipment) return null

  const sender = shipment.parties.find((p) => p.type === 'sender')
  const receiver = shipment.parties.find((p) => p.type === 'receiver')

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5 pb-10">
        <View className="gap-1">
          <Text className="text-2xl font-extrabold text-ink" accessibilityRole="header">
            {shipment.reference || `#${shipment.id}`}
          </Text>
          <Text className="text-sm text-muted">{new Date(shipment.created_at).toLocaleString()}</Text>
        </View>

        <View className="gap-3.5 rounded-md border border-line bg-white p-4">
          <Row label="Carrier" value={`${shipment.carrier_code} ${shipment.description}`} />
          <Row label="Tracking" value={shipment.external_pkg_no || shipment.pkg_no} />
          <Row label="Price" value={`${shipment.price} DKK`} />
          <Row label="Recipient" value={`${receiver?.name ?? ''}\n${receiver?.address1 ?? ''}, ${receiver?.postal_code ?? ''} ${receiver?.city ?? ''}`} />
          <Row label="Sender" value={`${sender?.name ?? ''}\n${sender?.address1 ?? ''}, ${sender?.postal_code ?? ''} ${sender?.city ?? ''}`} />
        </View>

        {printStatus === 'printing' ? <PrintProgressBar progress={printProgress} /> : <Button label="Reprint label" onPress={reprint} />}
        {printStatus === 'ok' && (
          <Text className="text-center text-base font-semibold text-success" accessibilityRole="alert">
            Label sent to the printer.
          </Text>
        )}
        {printStatus === 'error' && (
          <View className="rounded-sm bg-error-bg p-3">
            <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
              {printMessage}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="text-xs font-bold uppercase text-muted">{label}</Text>
      <Text className="text-base text-ink">{value}</Text>
    </View>
  )
}
