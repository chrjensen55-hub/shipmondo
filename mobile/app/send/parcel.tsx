import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Plus, Ruler, Trash2, CheckCircle2 } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { StepProgress } from '@/components/StepProgress'
import { useWizard, firstParcelSize } from '@/lib/wizard-context'
import { boxSizeFor, weightBrackets } from '@/lib/carrierRates'
import { useLang } from '@/lib/i18n'
import type { Parcel } from '@/lib/types'

// Plain "0 - 1 kg" rather than switching to grams below 1kg — a customer glancing at the tile
// should be able to read the range at a single unit without doing a mental conversion.
function formatWeightRange(lower: number, upper: number) {
  return `${lower} - ${upper} kg`
}

// Box icon size steps up in fixed increments across the bracket range so the largest boxes read as
// bigger without a 35 kg box becoming 35x the size of a 1 kg one.
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
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5 pb-10 pt-16">
        <StepProgress step={3} />
        <Text className="text-2xl font-extrabold text-ink" accessibilityRole="header">
          {tr.weightHeading}
        </Text>
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
        <Pressable
          accessibilityRole="button"
          onPress={addParcel}
          className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-md border border-dashed border-muted bg-white active:bg-cream"
        >
          <Plus size={18} color="#0369a1" />
          <Text className="text-base font-semibold text-green">{tr.addParcel}</Text>
        </Pressable>
      </ScrollView>
      <View className="flex-row items-center justify-between gap-3 border-t border-line bg-white p-5">
        <View className="flex-1">
          <Button label={tr.backAction} variant="secondary" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <Button label={tr.continueAction} onPress={() => router.push('/send/sender')} disabled={!canContinue} />
        </View>
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
    <View className="gap-3.5 rounded-md border border-line bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-ink">
          {tr.parcelLabel} {index + 1}
        </Text>
        {canRemove && (
          <Pressable accessibilityRole="button" onPress={onRemove} className="flex-row items-center gap-1 py-1">
            <Trash2 size={16} color="#a33b2e" />
            <Text className="text-sm font-semibold text-error">{tr.remove}</Text>
          </Pressable>
        )}
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        {brackets.map((max, i) => {
          const lower = i === 0 ? 0 : brackets[i - 1]
          const selected = selectedWeight === max
          const box = boxSizeFor(max)
          return (
            <Pressable
              key={max}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatWeightRange(lower, max)}, ${tr.maxSizeLabel} ${box.length}×${box.width}×${box.height} cm`}
              onPress={() => onChooseWeight(max)}
              className={`min-h-[104px] w-[31%] items-center justify-center gap-1 rounded-md border-[1.5px] px-1 py-2.5 active:bg-line ${selected ? 'border-ocean bg-mint' : 'border-line bg-cream'}`}
            >
              {selected && (
                <View className="absolute right-1.5 top-1.5">
                  <CheckCircle2 size={18} color="#075985" fill="#ffffff" />
                </View>
              )}
              <Package size={iconSizeFor(i, brackets.length)} color={selected ? '#075985' : '#5c7080'} strokeWidth={1.75} />
              <Text className={`text-center text-sm font-bold ${selected ? 'text-ocean' : 'text-ink'}`}>{formatWeightRange(lower, max)}</Text>
              <Text className="text-center text-xs text-muted">
                {tr.maxSizeLabel} {box.length}×{box.width}×{box.height} cm
              </Text>
            </Pressable>
          )
        })}
      </View>
      {selectedWeight !== null && (
        <View className="gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <Ruler size={15} color="#5c7080" />
            <Text className="text-sm font-bold text-ink">{tr.exactSizeLabel}</Text>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <TextField label={tr.lengthLabel} keyboardType="number-pad" value={String(parcel.length)} onChangeText={(v) => onUpdateDimension('length', v)} />
            </View>
            <View className="flex-1">
              <TextField label={tr.widthLabel} keyboardType="number-pad" value={String(parcel.width)} onChangeText={(v) => onUpdateDimension('width', v)} />
            </View>
            <View className="flex-1">
              <TextField label={tr.heightLabel} keyboardType="number-pad" value={String(parcel.height)} onChangeText={(v) => onUpdateDimension('height', v)} />
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
