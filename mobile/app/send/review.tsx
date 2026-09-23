import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as Crypto from 'expo-crypto'
import { Truck, Package, UserRound, MapPin, type LucideIcon } from 'lucide-react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { CarrierLogo } from '@/components/CarrierLogo'
import { useWizard, HS_CODE_RE } from '@/lib/wizard-context'
import { countries } from '@/lib/countries'
import { api, ApiError } from '@/lib/api'
import { useLang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'

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
    if (!confirmed || !quote || missingHsCode) return
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

  return (
    <WizardScreen title={tr.reviewHeading} step={7} onContinue={book} continueLabel={booking ? tr.creatingShipment : tr.confirmCreateShipment} continueDisabled={!confirmed || booking || missingHsCode || !quote} continueLoading={booking} error={error}>
      <View style={styles.card}>
        <Row icon={Truck} label={tr.cardCarrier} value={`${draft.carrierName ?? ''} — ${countryName(draft.originCountry)} → ${countryName(draft.destinationCountry)}`} />
        <Row icon={Package} label={tr.cardParcel} value={`${parcelCount} ${parcelUnit}, ${draft.parcels.reduce((n, p) => n + p.weight, 0)} kg`} />
        <Row icon={UserRound} label={tr.cardSender} value={`${draft.sender.fullName}\n${draft.sender.address1}, ${draft.sender.postalCode} ${draft.sender.city}`} />
        <Row icon={MapPin} label={tr.cardRecipient} value={`${draft.recipient.fullName}\n${draft.recipient.address1}, ${draft.recipient.postalCode} ${draft.recipient.city}`} last />
      </View>
      <View style={styles.serviceCard}>
        <View style={styles.serviceInfo}>
          <CarrierLogo name={quote?.carrier ?? ''} size={36} />
          <Text style={styles.serviceName}>
            {quote?.carrier} {quote?.serviceName}
          </Text>
        </View>
        <Text style={styles.servicePrice}>{quote?.customerPrice} DKK</Text>
      </View>
      {missingHsCode && (
        <Pressable style={styles.notice} onPress={() => router.push('/send/customs')}>
          <Text style={styles.noticeText}>{tr.customsNotice}</Text>
        </Pressable>
      )}
      <Pressable style={styles.confirmRow} onPress={() => setConfirmed((v) => !v)} disabled={missingHsCode}>
        <View style={[styles.checkbox, confirmed && styles.checkboxChecked]} />
        <Text style={styles.confirmText}>{tr.confirmCorrect}</Text>
      </Pressable>
    </WizardScreen>
  )
}

function Row({ icon: Icon, label, value, last }: { icon: LucideIcon; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowHeader}>
        <Icon size={15} color={colors.muted} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16 },
  row: { gap: 4, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  rowValue: { color: colors.ink, fontSize: 15 },
  serviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.mint, borderRadius: radius.md, padding: 16 },
  serviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  serviceName: { fontWeight: '700', color: colors.ink },
  servicePrice: { fontWeight: '800', fontSize: 18, color: colors.greenDark },
  notice: { backgroundColor: colors.errorBg, borderRadius: radius.sm, padding: 14 },
  noticeText: { color: colors.error },
  confirmRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.ocean, borderColor: colors.ocean },
  confirmText: { flex: 1, color: colors.ink },
})
