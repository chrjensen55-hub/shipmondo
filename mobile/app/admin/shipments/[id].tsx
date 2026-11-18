import { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AdminHeader } from '@/components/AdminHeader'
import { Button } from '@/components/Button'
import { PrintProgressBar } from '@/components/PrintProgressBar'
import { formatPrice } from '@/components/ShipmentRow'
import { api } from '@/lib/api'
import { base64ToUtf8 } from '@/lib/base64'
import { CONTENT_MAX_WIDTH, PADDED_MAX_WIDTH } from '@/lib/layout'
import { printZplViaBluetooth } from '@/lib/zebraBluetooth'
import type { ShipmondoShipment } from '@/lib/types'

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
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

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/admin/shipments')
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
        <AdminHeader title="Shipment" backLabel="Shipments" onBack={goBack} />
        <View className={`w-full ${PADDED_MAX_WIDTH} self-center px-5`}>
          <View className="rounded-sm bg-error-bg p-3.5">
            <Text className="text-center text-base font-medium text-error" accessibilityRole="alert">
              {loadError}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }
  if (!shipment) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
        <AdminHeader title="Shipment" backLabel="Shipments" onBack={goBack} />
        <ActivityIndicator className="mt-10" size="large" color="#0B4F82" />
      </SafeAreaView>
    )
  }

  const sender = shipment.parties.find((p) => p.type === 'sender')
  const receiver = shipment.parties.find((p) => p.type === 'receiver')

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <AdminHeader title={shipment.reference || `#${shipment.id}`} subtitle={new Date(shipment.created_at).toLocaleString()} backLabel="Shipments" onBack={goBack} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        <View className={`w-full ${CONTENT_MAX_WIDTH} gap-4 self-center`}>
          <View className="rounded-md border border-line bg-white px-4">
            <Row label="Carrier" value={`${shipment.carrier_code} ${shipment.description}`} />
            <Row label="Tracking" value={shipment.external_pkg_no || shipment.pkg_no} />
            <Row label="Price" value={`${formatPrice(shipment.price)} DKK`} />
            <Row label="Recipient" value={`${receiver?.name ?? ''}
${receiver?.address1 ?? ''}, ${receiver?.postal_code ?? ''} ${receiver?.city ?? ''}`} />
            <Row label="Sender" value={`${sender?.name ?? ''}
${sender?.address1 ?? ''}, ${sender?.postal_code ?? ''} ${sender?.city ?? ''}`} last />
          </View>

          {printStatus === 'printing' ? <PrintProgressBar progress={printProgress} /> : <Button label="Reprint label" size="lg" onPress={reprint} />}
          {printStatus === 'ok' && (
            <View className="rounded-sm bg-success-bg p-3">
              <Text className="text-center text-base font-semibold text-success" accessibilityRole="alert">
                Label sent to the printer.
              </Text>
            </View>
          )}
          {printStatus === 'error' && (
            <View className="rounded-sm bg-error-bg p-3">
              <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
                {printMessage}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`gap-0.5 py-3 ${last ? '' : 'border-b border-line'}`}>
      <Text className="text-xs font-bold uppercase text-muted">{label}</Text>
      <Text className="text-base text-ink">{value}</Text>
    </View>
  )
}
