import { useCallback, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, BackHandler, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CircleCheck, CheckCircle2 } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { PrintProgressBar } from '@/components/PrintProgressBar'
import { useWizard } from '@/lib/wizard-context'
import { api, ApiError } from '@/lib/api'
import { printZplViaBluetooth } from '@/lib/zebraBluetooth'
import { useLang } from '@/lib/i18n'
import { base64ToUtf8 } from '@/lib/base64'


type PrintState = 'ready' | 'preparing' | 'printing' | 'printed' | 'failed'

// The booking already exists by the time this screen shows. The flow is Print Label → printed →
// Exit; Exit is the only way out once the label is printed, and it prepares the app for the next
// shipment without touching the booking itself. Hardware back is swallowed so the wizard can't be
// re-entered and used to create a duplicate booking.
export default function Confirmation() {
  const router = useRouter()
  const { reset } = useWizard()
  const tr = useLang()
  const { reference, tracking, shipmentId, customerPrice } = useLocalSearchParams<{ reference: string; tracking: string; shipmentId: string; customerPrice: string }>()
  const [state, setState] = useState<PrintState>('ready')
  const [printProgress, setPrintProgress] = useState(0)
  const [error, setError] = useState('')

  async function printLabel() {
    if (state === 'preparing' || state === 'printing') return
    if (!shipmentId) {
      setError(tr.labelNotAvailable)
      setState('failed')
      return
    }
    setError('')
    setPrintProgress(0)
    setState('preparing')
    try {
      const labels = await api<{ base64: string; file_format: string }[]>(`/api/shipments/${shipmentId}/labels?format=zpl`)
      const label = labels[0]
      if (!label) throw new Error(tr.labelNotAvailable)
      setState('printing')
      await printZplViaBluetooth(base64ToUtf8(label.base64), setPrintProgress)
      setState('printed')
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : tr.printError)
      setState('failed')
    }
  }

  function exit() {
    reset()
    router.dismissAll()
    router.replace('/send')
  }

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
      return () => sub.remove()
    }, []),
  )

  const busy = state === 'preparing' || state === 'printing'

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="gap-5 p-5 pb-10 pt-16" className="flex-1">
        <View className="items-center gap-3">
          <CircleCheck color="#0a7a4a" size={56} />
          <Text className="text-center text-2xl font-extrabold text-ink" accessibilityRole="header">
            {tr.shipmentCreated}
          </Text>
          <Text className="text-center text-base text-muted">{tr.bookedReady}</Text>
        </View>

        <View className="w-full max-w-md self-center gap-3 rounded-md border border-line bg-white p-5">
          <Row label={tr.reference} value={reference} />
          <Row label={tr.trackingNumber} value={tracking} />
          <Row label={tr.total} value={`${customerPrice} DKK`} />
        </View>

        <View className="w-full max-w-md self-center gap-4">
          {state === 'printed' ? (
            <View className="items-center gap-4">
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={22} color="#0a7a4a" />
                <Text className="text-lg font-bold text-success" accessibilityRole="alert">
                  {tr.labelPrintedSuccess}
                </Text>
              </View>
              <Button label={tr.exitAction} variant="neutral" onPress={exit} />
            </View>
          ) : state === 'printing' ? (
            <PrintProgressBar progress={printProgress} />
          ) : state === 'preparing' ? (
            <View className="min-h-[52px] flex-row items-center justify-center gap-3 rounded-md bg-ocean px-6">
              <ActivityIndicator color="#ffffff" />
              <Text className="text-base font-semibold text-white">{tr.preparingLabel}</Text>
            </View>
          ) : (
            <Button label={tr.printLabel} variant="primary" onPress={printLabel} disabled={busy} accessibilityLabel={tr.printLabel} />
          )}
          {state === 'failed' && error ? (
            <View className="rounded-sm bg-error-bg p-3.5">
              <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
                {error}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-base text-muted">{label}</Text>
      <Text className="flex-shrink text-right text-base font-bold text-ink">{value}</Text>
    </View>
  )
}
