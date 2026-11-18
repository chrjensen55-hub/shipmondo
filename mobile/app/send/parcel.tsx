import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Package, Plus, Ruler, Trash2, CheckCircle2 } from 'lucide-react-native'
import { TextField } from '@/components/TextField'
import { WizardScreen } from '@/components/WizardScreen'
import { useWizard, firstParcelSize } from '@/lib/wizard-context'
import { useLocations } from '@/lib/location-context'
import { boxSizeFor, weightBrackets } from '@/lib/carrierRates'
import { useLang } from '@/lib/i18n'
import type { Parcel } from '@/lib/types'

// Registered letter (PostNord PDK_RE): documents only, max 2 kg, flat 295 kr, outside Denmark.
const REGISTERED_LETTER_MAX_KG = 2
const REGISTERED_LETTER_PRICE = 295
const LETTER_BOX = { length: 35, width: 25, height: 3 }

/* eslint-disable @typescript-eslint/no-require-imports */
const boxWeightImage = require('../../assets/images/box-weight.png')
const boxSizeImage = require('../../assets/images/box-size.png')
/* eslint-enable @typescript-eslint/no-require-imports */

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
  const { activeLocation } = useLocations()
  const tr = useLang()
  const [weightChosen, setWeightChosen] = useState<Set<string>>(new Set())
  const brackets = weightBrackets(draft.deliveryLocation, activeLocation.rates)

  const isPostNord = draft.carrierName === 'PostNord'
  const letter = isPostNord && !!draft.registeredLetter
  const shownBrackets = letter ? [REGISTERED_LETTER_MAX_KG] : brackets

  function chooseType(asLetter: boolean) {
    setWeightChosen(new Set())
    setDraft((d) => ({
      ...d,
      registeredLetter: asLetter,
      contentsType: asLetter ? 'DOCUMENTS' : 'GOODS',
      deliveryLocation: asLetter ? 'home' : d.deliveryLocation,
      parcels: asLetter ? d.parcels.slice(0, 1) : d.parcels,
    }))
  }

  function chooseWeight(id: string, maxWeight: number) {
    setWeightChosen((prev) => new Set(prev).add(id))
    const box = letter ? LETTER_BOX : boxSizeFor(maxWeight)
    setDraft((d) => ({ ...d, parcels: d.parcels.map((p) => (p.id === id ? { ...p, weight: maxWeight, ...box } : p)) }))
  }

  function updateDimension(id: string, key: 'length' | 'width' | 'height', value: string) {
    const n = Number(value.replace(/[^0-9]/g, '')) || 0
    setDraft((d) => ({ ...d, parcels: d.parcels.map((p) => (p.id === id ? { ...p, [key]: n } : p)) }))
  }

  function addParcel() {
    const id = `parcel-${Date.now()}`
    setDraft((d) => ({ ...d, parcels: [...d.parcels, { id, ...firstParcelSize(d.deliveryLocation, activeLocation.rates) }] }))
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
    <WizardScreen
      title={tr.weightHeading}
      subtitle={tr.weightHint}
      step={3}
      icons={[boxWeightImage, boxSizeImage]}
      onContinue={() => router.push('/send/sender')}
      continueDisabled={!canContinue}
      continueHint={tr.weightMissingHint}
    >
      {isPostNord && (
        <View className="flex-row gap-3">
          <TypeCard selected={!letter} title={tr.parcelTypeParcel} hint={tr.parcelTypeParcelHint} onPress={() => chooseType(false)} />
          <TypeCard selected={letter} title={tr.parcelTypeLetter} hint={tr.parcelTypeLetterHint} price={`${REGISTERED_LETTER_PRICE} kr`} onPress={() => chooseType(true)} />
        </View>
      )}
      {draft.parcels.map((parcel, index) => (
        <ParcelCard
          key={parcel.id}
          parcel={parcel}
          index={index}
          letter={letter}
          brackets={shownBrackets}
          selectedWeight={weightChosen.has(parcel.id) ? parcel.weight : null}
          canRemove={draft.parcels.length > 1}
          onChooseWeight={(max) => chooseWeight(parcel.id, max)}
          onUpdateDimension={(key, value) => updateDimension(parcel.id, key, value)}
          onRemove={() => removeParcel(parcel.id)}
        />
      ))}
      {!letter && (
        <Pressable
          accessibilityRole="button"
          onPress={addParcel}
          className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-md border border-dashed border-ocean bg-white active:bg-cream"
        >
          <Plus size={18} color="#0B4F82" />
          <Text className="text-base font-medium text-ocean">{tr.addParcel}</Text>
        </Pressable>
      )}
    </WizardScreen>
  )
}

function ParcelCard({
  parcel,
  index,
  letter,
  brackets,
  selectedWeight,
  canRemove,
  onChooseWeight,
  onUpdateDimension,
  onRemove,
}: {
  parcel: Parcel
  index: number
  letter: boolean
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
              className={`min-h-[104px] w-[31%] items-center justify-center gap-1 rounded-md border-2 px-1 py-2.5 active:bg-line sm:min-h-[124px] ${selected ? 'border-ocean bg-mint' : 'border-line bg-white'}`}
            >
              {selected && (
                <View className="absolute right-1.5 top-1.5">
                  <CheckCircle2 size={18} color="#0B4F82" fill="#ffffff" />
                </View>
              )}
              <Package size={iconSizeFor(i, brackets.length)} color={selected ? '#0B4F82' : '#6B7280'} strokeWidth={1.75} />
              <Text className={`text-center text-sm font-bold sm:text-lg ${selected ? 'text-ocean' : 'text-ink'}`}>{formatWeightRange(lower, max)}</Text>
              <Text className="text-center text-xs text-muted sm:text-sm">
                {tr.maxSizeLabel} {box.length}×{box.width}×{box.height} cm
              </Text>
            </Pressable>
          )
        })}
      </View>
      {selectedWeight !== null && !letter && (
        <View className="gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <Ruler size={15} color="#6B7280" />
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

function TypeCard({ selected, title, hint, price, onPress }: { selected: boolean; title: string; hint: string; price?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-1 gap-1 rounded-md border-2 p-4 active:bg-cream ${selected ? 'border-ocean bg-mint' : 'border-line bg-white'}`}
    >
      <Text className="text-base font-bold text-ink sm:text-lg">{title}</Text>
      <Text className="text-sm text-muted">{hint}</Text>
      {price ? <Text className="text-sm font-bold text-ocean sm:text-base">{price}</Text> : null}
    </Pressable>
  )
}
