import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import * as Crypto from 'expo-crypto'
import { Truck, Package, UserRound, MapPin, AlertTriangle, Check, type LucideIcon } from 'lucide-react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { CarrierLogo } from '@/components/CarrierLogo'
import { useWizard, HS_CODE_RE, SERVICE_POINT_LABEL } from '@/lib/wizard-context'
import { countries } from '@/lib/countries'
import { api, ApiError } from '@/lib/api'
import { useLang } from '@/lib/i18n'

export default function ReviewStep() {
  const router = useRouter()
  const { draft, quotes, needsCustoms } = useWizard()
  const tr = useLang()
  const [confirmed, setConfirmed] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const quote = quotes.find((q) => q.id === draft.selectedQuoteId)

  const missingHsCode = needsCustoms && (!draft.items.length || draft.items.some((i) => !i.hsCode || !HS_CODE_RE.test(i.hsCode)))

  function countryName(code: string) {
    return countries.find((c) => c.code === code)?.name ?? code
  }

  async function book() {
    if (!confirmed || !quote || missingHsCode || booking) return
    setBooking(true)
    setError('')
    try {
      const result = await api<{ reference: string; tracking: string; shipmentId?: number }>('/api/shipments', {
        method: 'POST',
        body: JSON.stringify({ ...draft, confirmation: true, idempotencyKey: Crypto.randomUUID() }),
      })
      router.replace({ pathname: '/send/confirmation', params: { reference: result.reference, tracking: result.tracking, shipmentId: String(result.shipmentId ?? ''), customerPrice: String(quote.customerPrice) } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr.bookingError)
    } finally {
      setBooking(false)
    }
  }

  const parcelCount = draft.parcels.length
  const parcelUnit = parcelCount > 1 ? tr.parcelPlural : tr.parcelSingular
  const canSubmit = confirmed && !booking && !missingHsCode && !!quote

  return (
    <WizardScreen
      title={tr.reviewHeading}
      subtitle={tr.reviewHint}
      step={7}
      onContinue={book}
      continueLabel={booking ? tr.creatingShipment : tr.confirmCreateShipment}
      continueDisabled={!canSubmit}
      continueLoading={booking}
      error={error}
    >
      <View className="rounded-md border border-line bg-white px-4">
        <View className="flex-row items-center justify-between gap-3 border-b border-line py-3.5">
          <View className="flex-shrink flex-row items-center gap-2.5">
            <CarrierLogo name={quote?.carrier ?? draft.carrierName ?? ''} size={36} />
            <Text className="flex-shrink text-sm font-bold text-ink">{quote?.serviceName}</Text>
          </View>
          <Text className="text-lg font-bold text-ocean">{quote?.customerPrice} DKK</Text>
        </View>
        <Row icon={Package} label={tr.cardParcel} value={`${parcelCount} ${parcelUnit}, ${draft.parcels.reduce((n, p) => n + p.weight, 0)} kg`} />
        <Row icon={UserRound} label={tr.cardSender} value={`${draft.sender.fullName}
${draft.sender.address1}, ${draft.sender.postalCode} ${draft.sender.city}`} />
        <Row
          icon={MapPin}
          label={tr.cardRecipient}
          value={`${draft.recipient.fullName}
${draft.recipient.address1}, ${draft.recipient.postalCode} ${draft.recipient.city}
${countryName(draft.originCountry)} → ${countryName(draft.destinationCountry)}`}
        />
        <Row icon={Truck} label={tr.cardDelivery} value={draft.deliveryLocation === 'service_point' ? (draft.carrierName && SERVICE_POINT_LABEL[draft.carrierName]) || tr.servicePointFallback : tr.homeDelivery} last />
      </View>

      {missingHsCode && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/send/customs')} className="flex-row items-center gap-2.5 rounded-sm bg-error-bg p-3.5 active:opacity-80">
          <AlertTriangle size={18} color="#a33b2e" />
          <Text className="flex-1 text-sm font-medium text-error">{tr.customsNotice}</Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed, disabled: missingHsCode }}
        onPress={() => setConfirmed((v) => !v)}
        disabled={missingHsCode}
        className="flex-row items-start gap-3 py-1"
      >
        <View className={`mt-0.5 h-6 w-6 items-center justify-center rounded-[6px] border-2 ${confirmed ? 'border-ocean bg-ocean' : 'border-line bg-white'}`}>
          {confirmed && <Check size={15} color="#ffffff" />}
        </View>
        <Text className="flex-1 text-sm text-ink">{tr.confirmCorrect}</Text>
      </Pressable>
    </WizardScreen>
  )
}

function Row({ icon: Icon, label, value, last }: { icon: LucideIcon; label: string; value: string; last?: boolean }) {
  return (
    <View className={`gap-1 py-3 ${last ? '' : 'border-b border-line'}`}>
      <View className="flex-row items-center gap-1.5">
        <Icon size={15} color="#6B7280" />
        <Text className="text-xs font-semibold text-muted">{label}</Text>
      </View>
      <Text className="text-sm text-ink">{value}</Text>
    </View>
  )
}
