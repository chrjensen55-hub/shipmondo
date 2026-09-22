import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as Crypto from 'expo-crypto'
import { WizardScreen } from '@/components/WizardScreen'
import { useWizard, HS_CODE_RE } from '@/lib/wizard-context'
import { countries } from '@/lib/countries'
import { api, ApiError } from '@/lib/api'
import { colors, radius } from '@/lib/theme'

export default function ReviewStep() {
  const router = useRouter()
  const { draft, quotes, needsCustoms } = useWizard()
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
      setError(err instanceof ApiError ? err.message : 'Could not create the shipment. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  return (
    <WizardScreen title="Review your shipment" onContinue={book} continueLabel={booking ? 'Creating shipment…' : 'Confirm and create shipment'} continueDisabled={!confirmed || booking || missingHsCode || !quote} continueLoading={booking} error={error}>
      <View style={styles.card}>
        <Row label="Carrier" value={`${draft.carrierName ?? ''} — ${countryName(draft.originCountry)} → ${countryName(draft.destinationCountry)}`} />
        <Row label="Parcel" value={`${draft.parcels.length} parcel${draft.parcels.length > 1 ? 's' : ''}, ${draft.parcels.reduce((n, p) => n + p.weight, 0)} kg`} />
        <Row label="Sender" value={`${draft.sender.fullName}\n${draft.sender.address1}, ${draft.sender.postalCode} ${draft.sender.city}`} />
        <Row label="Recipient" value={`${draft.recipient.fullName}\n${draft.recipient.address1}, ${draft.recipient.postalCode} ${draft.recipient.city}`} />
      </View>
      <View style={styles.serviceCard}>
        <Text style={styles.serviceName}>
          {quote?.carrier} {quote?.serviceName}
        </Text>
        <Text style={styles.servicePrice}>{quote?.customerPrice} DKK</Text>
      </View>
      {missingHsCode && (
        <Pressable style={styles.notice} onPress={() => router.push('/send/customs')}>
          <Text style={styles.noticeText}>Customs details are required for this destination. Tap to add them.</Text>
        </Pressable>
      )}
      <Pressable style={styles.confirmRow} onPress={() => setConfirmed((v) => !v)} disabled={missingHsCode}>
        <View style={[styles.checkbox, confirmed && styles.checkboxChecked]} />
        <Text style={styles.confirmText}>I confirm the details above are correct and the customer accepts the price.</Text>
      </Pressable>
    </WizardScreen>
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
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  row: { gap: 2 },
  rowLabel: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  rowValue: { color: colors.ink, fontSize: 15 },
  serviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.mint, borderRadius: radius.md, padding: 16 },
  serviceName: { fontWeight: '700', color: colors.ink },
  servicePrice: { fontWeight: '800', fontSize: 18, color: colors.greenDark },
  notice: { backgroundColor: colors.errorBg, borderRadius: radius.sm, padding: 14 },
  noticeText: { color: colors.error },
  confirmRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.ocean, borderColor: colors.ocean },
  confirmText: { flex: 1, color: colors.ink },
})
