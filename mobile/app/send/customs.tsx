import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Plus, Trash2 } from 'lucide-react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { TextField } from '@/components/TextField'
import { useWizard, HS_CODE_RE } from '@/lib/wizard-context'
import { useLang } from '@/lib/i18n'
import type { ShipmentItem } from '@/lib/types'

function blankItem(id: string, weight: number, originCountry: string): ShipmentItem {
  return { id, description: '', quantity: 1, unitValue: 0, currency: 'DKK', weight, originCountry, hsCode: '' }
}

export default function CustomsStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const tr = useLang()

  useEffect(() => {
    if (draft.items.length === 0) {
      setDraft((d) => ({ ...d, items: [blankItem(`item-${Date.now()}`, d.parcels[0]?.weight ?? 1, d.originCountry)] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.items.length])

  function update(id: string, patch: Partial<ShipmentItem>) {
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  }

  function addItem() {
    setDraft((d) => ({ ...d, items: [...d.items, blankItem(`item-${Date.now()}`, d.parcels[0]?.weight ?? 1, d.originCountry)] }))
  }

  function removeItem(id: string) {
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }))
  }

  const valid = draft.items.length > 0 && draft.items.every((i) => i.description.trim().length > 1 && HS_CODE_RE.test(i.hsCode ?? '') && i.unitValue > 0)

  return (
    <WizardScreen title={tr.customsHeading} subtitle={tr.customsSubtitle} step={6} onContinue={() => router.push('/send/review')} continueDisabled={!valid}>
      <View className="gap-1.5">
        <Text className="text-sm font-semibold text-ink">{tr.exportReasonLabel}</Text>
        <View className="overflow-hidden rounded-sm border-[1.5px] border-line bg-white">
          <Picker selectedValue={draft.exportReason ?? 'sale_of_goods'} onValueChange={(v) => setDraft((d) => ({ ...d, exportReason: v }))}>
            <Picker.Item label={tr.exportReasonSale} value="sale_of_goods" />
            <Picker.Item label={tr.exportReasonGift} value="gift" />
            <Picker.Item label={tr.exportReasonSample} value="commercial_samples" />
            <Picker.Item label={tr.exportReasonReturn} value="returned_goods" />
            <Picker.Item label={tr.exportReasonOther} value="other" />
          </Picker>
        </View>
      </View>

      {draft.items.map((item, index) => (
        <View key={item.id} className="gap-3.5 rounded-md border border-line bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-ink">
              {tr.itemLabel} {index + 1}
            </Text>
            {draft.items.length > 1 && (
              <Pressable accessibilityRole="button" onPress={() => removeItem(item.id)} className="flex-row items-center gap-1 py-1">
                <Trash2 size={16} color="#a33b2e" />
                <Text className="text-sm font-semibold text-error">{tr.remove}</Text>
              </Pressable>
            )}
          </View>
          <TextField label={tr.contentsDescription} value={item.description} onChangeText={(v) => update(item.id, { description: v })} />
          <TextField label={tr.valueDkk} keyboardType="numeric" value={item.unitValue ? String(item.unitValue) : ''} onChangeText={(v) => update(item.id, { unitValue: v === '' ? 0 : Number(v) || 0 })} />
          <TextField label={tr.commodityCode} placeholder={tr.hsCodePlaceholder} value={item.hsCode ?? ''} onChangeText={(v) => update(item.id, { hsCode: v })} />
          <Text className="text-sm text-muted">{tr.hsCodeHelp}</Text>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={addItem}
        className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-md border border-dashed border-muted bg-white active:bg-cream"
      >
        <Plus size={18} color="#0369a1" />
        <Text className="text-base font-semibold text-green">{tr.addItem}</Text>
      </Pressable>
    </WizardScreen>
  )
}
