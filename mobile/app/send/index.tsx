import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useWizard, CARRIERS } from '@/lib/wizard-context'
import { CarrierLogo } from '@/components/CarrierLogo'
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
            <CarrierLogo name={c.name} size={64} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, borderRadius: radius.lg, paddingVertical: 28 },
  cardSelected: { borderColor: colors.ocean },
})
