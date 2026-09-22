import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, Trash2 } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useWizard, firstParcelSize } from '@/lib/wizard-context'
import { boxSizeFor, weightBrackets } from '@/lib/carrierRates'
import { colors, radius } from '@/lib/theme'
import type { Parcel } from '@/lib/types'

function formatWeight(kg: number) {
  return kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg} kg`
}

export default function ParcelStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const [weightChosen, setWeightChosen] = useState<Set<string>>(new Set())
  const brackets = weightBrackets(draft.deliveryLocation)

  function chooseWeight(id: string, maxWeight: number) {
    setWeightChosen((prev) => new Set(prev).add(id))
    const box = boxSizeFor(maxWeight)
    setDraft((d) => ({ ...d, parcels: d.parcels.map((p) => (p.id === id ? { ...p, weight: maxWeight, ...box } : p)) }))
  }

  function updateDimension(id: string, key: 'length' | 'width' | 'height', value: string) {
    const n = Number(value.replace(/[^0-9]/g, '')) || 0
    setDraft((d) => ({ ...d, parcels: d.parcels.map((p) => (p.id === id ? { ...p, [key]: n } : p)) }))
  }

  function addParcel() {
    const id = `parcel-${Date.now()}`
    setDraft((d) => ({ ...d, parcels: [...d.parcels, { id, ...firstParcelSize(d.deliveryLocation) }] }))
  }

  function removeParcel(id: string) {
    setDraft((d) => ({ ...d, parcels: d.parcels.filter((p) => p.id !== id) }))
    setWeightChosen((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const canContinue = draft.parcels.every((p) => weightChosen.has(p.id) && p.weight > 0 && p.length > 0 && p.width > 0 && p.height > 0)

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>How much does it weigh?</Text>
        {draft.parcels.map((parcel, index) => (
          <ParcelCard
            key={parcel.id}
            parcel={parcel}
            index={index}
            brackets={brackets}
            selectedWeight={weightChosen.has(parcel.id) ? parcel.weight : null}
            canRemove={draft.parcels.length > 1}
            onChooseWeight={(max) => chooseWeight(parcel.id, max)}
            onUpdateDimension={(key, value) => updateDimension(parcel.id, key, value)}
            onRemove={() => removeParcel(parcel.id)}
          />
        ))}
        <Pressable style={styles.addButton} onPress={addParcel}>
          <Plus size={18} color={colors.green} />
          <Text style={styles.addButtonText}>Add another parcel</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
        <Button label="Continue" onPress={() => router.push('/send/sender')} disabled={!canContinue} />
      </View>
    </SafeAreaView>
  )
}

function ParcelCard({
  parcel,
  index,
  brackets,
  selectedWeight,
  canRemove,
  onChooseWeight,
  onUpdateDimension,
  onRemove,
}: {
  parcel: Parcel
  index: number
  brackets: number[]
  selectedWeight: number | null
  canRemove: boolean
  onChooseWeight: (max: number) => void
  onUpdateDimension: (key: 'length' | 'width' | 'height', value: string) => void
  onRemove: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Parcel {index + 1}</Text>
        {canRemove && (
          <Pressable style={styles.removeButton} onPress={onRemove}>
            <Trash2 size={16} color={colors.error} />
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.chips}>
        {brackets.map((max, i) => {
          const lower = i === 0 ? 0 : brackets[i - 1]
          const selected = selectedWeight === max
          return (
            <Pressable key={max} style={[styles.chip, selected && styles.chipSelected]} onPress={() => onChooseWeight(max)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {formatWeight(lower)}–{formatWeight(max)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {selectedWeight !== null && (
        <View style={styles.dims}>
          <Text style={styles.dimsLabel}>Parcel size (cm)</Text>
          <View style={styles.dimsRow}>
            <TextField label="Length" keyboardType="number-pad" value={String(parcel.length)} onChangeText={(v) => onUpdateDimension('length', v)} />
            <TextField label="Width" keyboardType="number-pad" value={String(parcel.width)} onChangeText={(v) => onUpdateDimension('width', v)} />
            <TextField label="Height" keyboardType="number-pad" value={String(parcel.height)} onChangeText={(v) => onUpdateDimension('height', v)} />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  removeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.ocean, borderColor: colors.ocean },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  dims: { gap: 8 },
  dimsLabel: { fontWeight: '700', color: colors.ink },
  dimsRow: { flexDirection: 'row', gap: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderStyle: 'dashed', borderColor: '#aab8b1', borderRadius: radius.md },
  addButtonText: { color: colors.green, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
})
