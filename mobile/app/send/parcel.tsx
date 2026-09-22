import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useWizard } from '@/lib/wizard-context'
import { boxSizeFor, weightBrackets } from '@/lib/carrierRates'
import { colors } from '@/lib/theme'

function formatWeight(kg: number) {
  return kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg} kg`
}

export default function ParcelStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const parcel = draft.parcels[0]
  const [weightChosen, setWeightChosen] = useState(false)
  const brackets = weightBrackets(draft.deliveryLocation)

  function chooseWeight(maxWeight: number) {
    setWeightChosen(true)
    const box = boxSizeFor(maxWeight)
    setDraft((d) => ({ ...d, parcels: [{ ...d.parcels[0], weight: maxWeight, ...box }] }))
  }

  function updateDimension(key: 'length' | 'width' | 'height', value: string) {
    const n = Number(value.replace(/[^0-9]/g, '')) || 0
    setDraft((d) => ({ ...d, parcels: [{ ...d.parcels[0], [key]: n }] }))
  }

  const canContinue = weightChosen && parcel.weight > 0 && parcel.length > 0 && parcel.width > 0 && parcel.height > 0

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>How much does it weigh?</Text>
        <View style={styles.chips}>
          {brackets.map((max, i) => {
            const lower = i === 0 ? 0 : brackets[i - 1]
            const selected = weightChosen && parcel.weight === max
            return (
              <Pressable key={max} style={[styles.chip, selected && styles.chipSelected]} onPress={() => chooseWeight(max)}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {formatWeight(lower)}–{formatWeight(max)}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {weightChosen && (
          <View style={styles.dims}>
            <Text style={styles.dimsLabel}>Parcel size (cm)</Text>
            <View style={styles.dimsRow}>
              <TextField label="Length" keyboardType="number-pad" value={String(parcel.length)} onChangeText={(v) => updateDimension('length', v)} />
              <TextField label="Width" keyboardType="number-pad" value={String(parcel.width)} onChangeText={(v) => updateDimension('width', v)} />
              <TextField label="Height" keyboardType="number-pad" value={String(parcel.height)} onChangeText={(v) => updateDimension('height', v)} />
            </View>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
        <Button label="Continue" onPress={() => router.push('/send/sender')} disabled={!canContinue} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.ocean, borderColor: colors.ocean },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  dims: { gap: 8 },
  dimsLabel: { fontWeight: '700', color: colors.ink },
  dimsRow: { flexDirection: 'row', gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
})
