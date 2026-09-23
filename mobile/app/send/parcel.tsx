import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Plus, Ruler, Trash2, CheckCircle2 } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { StepProgress } from '@/components/StepProgress'
import { useWizard, firstParcelSize } from '@/lib/wizard-context'
import { boxSizeFor, weightBrackets } from '@/lib/carrierRates'
import { useLang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'
import type { Parcel } from '@/lib/types'

// Plain "0 - 1 kg" rather than switching to grams below 1kg — a customer glancing at the tile
// should be able to read the range at a single unit without doing a mental conversion.
function formatWeightRange(lower: number, upper: number) {
  return `${lower} - ${upper} kg`
}

// A bigger box icon per bracket gives an at-a-glance sense of scale (letter vs. big box) without
// making staff read numbers first — the icon size steps in fixed increments across the bracket
// range rather than scaling linearly with kg, since a 35kg box isn't 35x the visual size of a 1kg one.
function iconSizeFor(index: number, total: number) {
  const min = 22
  const max = 40
  if (total <= 1) return max
  return Math.round(min + ((max - min) * index) / (total - 1))
}

export default function ParcelStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const tr = useLang()
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
        <StepProgress step={3} />
        <Text style={styles.title}>{tr.weightHeading}</Text>
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
          <Text style={styles.addButtonText}>{tr.addParcel}</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.actions}>
        <Button label={tr.backAction} variant="secondary" onPress={() => router.back()} />
        <Button label={tr.continueAction} onPress={() => router.push('/send/sender')} disabled={!canContinue} />
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
  const tr = useLang()
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {tr.parcelLabel} {index + 1}
        </Text>
        {canRemove && (
          <Pressable style={styles.removeButton} onPress={onRemove}>
            <Trash2 size={16} color={colors.error} />
            <Text style={styles.removeText}>{tr.remove}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.tiles}>
        {brackets.map((max, i) => {
          const lower = i === 0 ? 0 : brackets[i - 1]
          const selected = selectedWeight === max
          const box = boxSizeFor(max)
          return (
            <Pressable key={max} style={[styles.tile, selected && styles.tileSelected]} onPress={() => onChooseWeight(max)}>
              {selected && (
                <View style={styles.tileCheck}>
                  <CheckCircle2 size={18} color={colors.ocean} fill={colors.white} />
                </View>
              )}
              <Package size={iconSizeFor(i, brackets.length)} color={selected ? colors.ocean : colors.muted} strokeWidth={1.75} />
              <Text style={[styles.tileWeight, selected && styles.tileWeightSelected]}>{formatWeightRange(lower, max)}</Text>
              <Text style={styles.tileDims}>
                {tr.maxSizeLabel} {box.length}×{box.width}×{box.height} cm
              </Text>
            </Pressable>
          )
        })}
      </View>
      {selectedWeight !== null && (
        <View style={styles.dims}>
          <View style={styles.dimsHeader}>
            <Ruler size={15} color={colors.muted} />
            <Text style={styles.dimsLabel}>{tr.exactSizeLabel}</Text>
          </View>
          <View style={styles.dimsRow}>
            <TextField label={tr.lengthLabel} keyboardType="number-pad" value={String(parcel.length)} onChangeText={(v) => onUpdateDimension('length', v)} />
            <TextField label={tr.widthLabel} keyboardType="number-pad" value={String(parcel.width)} onChangeText={(v) => onUpdateDimension('width', v)} />
            <TextField label={tr.heightLabel} keyboardType="number-pad" value={String(parcel.height)} onChangeText={(v) => onUpdateDimension('height', v)} />
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
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tileSelected: { borderColor: colors.ocean, backgroundColor: colors.mint },
  tileCheck: { position: 'absolute', top: 6, right: 6 },
  tileWeight: { fontWeight: '700', color: colors.ink, fontSize: 13, textAlign: 'center' },
  tileWeightSelected: { color: colors.ocean },
  tileDims: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  dims: { gap: 8 },
  dimsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dimsLabel: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  dimsRow: { flexDirection: 'row', gap: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderStyle: 'dashed', borderColor: '#aab8b1', borderRadius: radius.md },
  addButtonText: { color: colors.green, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
})
