import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useWizard, SERVICE_POINT_LABEL, firstParcelSize } from '@/lib/wizard-context'
import { weightBrackets } from '@/lib/carrierRates'
import { colors, radius } from '@/lib/theme'
import type { DeliveryLocation } from '@/lib/types'

export default function DeliveryStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()

  function select(location: DeliveryLocation) {
    setDraft((d) => {
      const brackets = weightBrackets(location)
      return { ...d, deliveryLocation: location, parcels: d.parcels.map((p) => (brackets.includes(p.weight) ? p : { ...p, ...firstParcelSize(location) })) }
    })
  }

  const servicePointLabel = draft.carrierName ? (SERVICE_POINT_LABEL[draft.carrierName] ?? 'Service point') : 'Service point'

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>How should it be delivered?</Text>
        <Pressable style={[styles.card, draft.deliveryLocation === 'home' && styles.cardSelected]} onPress={() => select('home')}>
          <Text style={styles.cardTitle}>Home delivery</Text>
          <Text style={styles.cardSub}>Delivered directly to the door</Text>
        </Pressable>
        <Pressable style={[styles.card, draft.deliveryLocation === 'service_point' && styles.cardSelected]} onPress={() => select('service_point')}>
          <Text style={styles.cardTitle}>{servicePointLabel}</Text>
          <Text style={styles.cardSub}>The recipient picks it up nearby</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
        <Button label="Continue" onPress={() => router.push('/send/parcel')} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, borderRadius: radius.lg, padding: 20 },
  cardSelected: { borderColor: colors.ocean },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  cardSub: { color: colors.muted, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
})
