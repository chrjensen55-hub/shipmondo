import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useWizard, CARRIERS } from '@/lib/wizard-context'
import { colors, radius } from '@/lib/theme'

export default function CarrierStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()

  function select(name: string) {
    setDraft((d) => ({ ...d, carrierName: name }))
    router.push('/send/delivery')
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Text style={styles.title}>Which carrier do you want to use?</Text>
      <View style={styles.grid}>
        {CARRIERS.map((c) => (
          <Pressable key={c.name} style={[styles.card, draft.carrierName === c.name && styles.cardSelected]} onPress={() => select(c.name)}>
            <Text style={styles.cardName}>{c.name}</Text>
            <Text style={styles.cardTagline}>{c.tagline}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 20 },
  grid: { gap: 12 },
  card: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, borderRadius: radius.lg, padding: 20 },
  cardSelected: { borderColor: colors.ocean },
  cardName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  cardTagline: { color: colors.muted, marginTop: 4 },
})
