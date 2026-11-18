import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import * as Crypto from 'expo-crypto'
import { Truck, Package, UserRound, MapPin, AlertTriangle, Check, type LucideIcon } from 'lucide-react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { CarrierLogo } from '@/components/CarrierLogo'
import { useWizard, HS_CODE_RE, SERVICE_POINT_LABEL } from '@/lib/wizard-context'
import { localCountryName } from '@/lib/countryNames'
import { api, ApiError } from '@/lib/api'
import { useLang, useLangCode } from '@/lib/i18n'

export default function ReviewStep() {
  const router = useRouter()
  const { draft, quotes, needsCustoms } = useWizard()
  const tr = useLang()
  const lang = useLangCode()
  const [confirmed, setConfirmed] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const quote = quotes.find((q) => q.id === draft.selectedQuoteId)

  const missingHsCode = needsCustoms && (!draft.items.length || draft.items.some((i) => !i.hsCode || !HS_CODE_RE.test(i.hsCode)))

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

  const servicePointName = (draft.carrierName && SERVICE_POINT_LABEL[draft.carrierName]) || tr.servicePointFallback
  const deliveryName = draft.deliveryLocation === 'service_point' ? servicePointName : draft.deliveryLocation === 'business' ? tr.businessDelivery : tr.homeDelivery

  return (
    <WizardScreen
      title={tr.reviewHeading}
      subtitle={tr.reviewHint}
      step={7}
      onContinue={book}
      continueLabel={booking ? tr.creatingShipment : tr.confirmCreateShipment}
      continueDisabled={!canSubmit}
      continueLoading={booking}
      continueHint={!confirmed && !missingHsCode ? tr.confirmMissingHint : undefined}
      error={error}
    >
      <View className="rounded-md border border-line bg-white">
        <View className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-shrink flex-row items-center gap-3">
            <CarrierLogo name={draft.carrierName ?? quote?.carrier ?? ''} size={44} />
            <View className="flex-shrink gap-0.5">
              <Text className="text-base font-bold text-ink">{quote?.serviceName}</Text>
              <Text className="text-sm text-muted">
                {localCountryName(draft.originCountry, lang)} → {localCountryName(draft.destinationCountry, lang)}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs font-semibold text-muted">{tr.priceLabel}</Text>
            <Text className="text-2xl font-bold text-ocean">{quote?.customerPrice} DKK</Text>
          </View>
        </View>

        <View className="gap-4 border-t border-line p-4 sm:flex-row sm:gap-6">
          <Row icon={UserRound} label={tr.cardSender} lines={[draft.sender.fullName, `${draft.sender.address1}, ${draft.sender.postalCode} ${draft.sender.city}`]} muted={[draft.sender.email, draft.sender.phone]} />
          <Row
            icon={MapPin}
            label={tr.cardRecipient}
            lines={[draft.recipient.company ?? '', draft.recipient.fullName, `${draft.recipient.address1}, ${draft.recipient.postalCode} ${draft.recipient.city}`, localCountryName(draft.destinationCountry, lang)]}
            muted={[draft.recipient.email, draft.recipient.phone]}
          />
        </View>

        <View className="gap-4 border-t border-line p-4 sm:flex-row sm:gap-6">
          <Row icon={Package} label={tr.cardParcel} lines={[`${parcelCount} ${parcelUnit}, ${draft.parcels.reduce((n, p) => n + p.weight, 0)} kg`]} />
          <Row icon={Truck} label={tr.cardDelivery} lines={[deliveryName]} />
        </View>
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
        className={`flex-row items-center gap-3 rounded-md border-2 p-4 ${confirmed ? 'border-ocean bg-mint' : 'border-line bg-white'} ${missingHsCode ? 'opacity-50' : 'active:bg-cream'}`}
      >
        <View className={`h-7 w-7 items-center justify-center rounded-[6px] border-2 ${confirmed ? 'border-ocean bg-ocean' : 'border-disabled bg-white'}`}>
          {confirmed && <Check size={17} color="#ffffff" />}
        </View>
        <Text className="flex-1 text-sm font-medium text-ink sm:text-base">{tr.confirmCorrect}</Text>
      </Pressable>
    </WizardScreen>
  )
}

// One block of the summary: a small round icon, a grey label, the main lines in dark text and the
// contact details in grey. Empty lines (no company, no phone) are left out.
function Row({ icon: Icon, label, lines, muted = [] }: { icon: LucideIcon; label: string; lines: string[]; muted?: string[] }) {
  return (
    <View className="flex-row gap-3 sm:flex-1">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-mint">
        <Icon size={17} color="#0B4F82" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs font-semibold uppercase text-muted">{label}</Text>
        {lines.filter(Boolean).map((line, i) => (
          <Text key={`l${i}`} className={`text-sm text-ink sm:text-base ${i === 0 ? 'font-semibold' : ''}`}>
            {line}
          </Text>
        ))}
        {muted.filter(Boolean).map((line, i) => (
          <Text key={`m${i}`} className="text-sm text-muted">
            {line}
          </Text>
        ))}
      </View>
    </View>
  )
}
