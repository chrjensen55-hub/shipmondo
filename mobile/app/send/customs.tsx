import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Plus, Trash2 } from 'lucide-react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { TextField } from '@/components/TextField'
import { useWizard, HS_CODE_RE } from '@/lib/wizard-context'
import { colors, radius } from '@/lib/theme'
import type { ShipmentItem } from '@/lib/types'

function blankItem(id: string, weight: number, originCountry: string): ShipmentItem {
  return { id, description: '', quantity: 1, unitValue: 0, currency: 'DKK', weight, originCountry, hsCode: '' }
}

export default function CustomsStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()

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
    <WizardScreen title="What's inside?" subtitle="The carrier requires a customs declaration for this destination." step={6} onContinue={() => router.push('/send/review')} continueDisabled={!valid}>
      <View>
        <Text style={styles.label}>Reason for export</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={draft.exportReason ?? 'sale_of_goods'} onValueChange={(v) => setDraft((d) => ({ ...d, exportReason: v }))}>
            <Picker.Item label="Sale of goods" value="sale_of_goods" />
            <Picker.Item label="Gift" value="gift" />
            <Picker.Item label="Commercial sample" value="commercial_samples" />
            <Picker.Item label="Returned goods" value="returned_goods" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
      </View>
      {draft.items.map((item, index) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Item {index + 1}</Text>
            {draft.items.length > 1 && (
              <Pressable style={styles.removeButton} onPress={() => removeItem(item.id)}>
                <Trash2 size={16} color={colors.error} />
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>
          <TextField label="Contents description" value={item.description} onChangeText={(v) => update(item.id, { description: v })} />
          <TextField label="Value (DKK)" keyboardType="numeric" value={item.unitValue ? String(item.unitValue) : ''} onChangeText={(v) => update(item.id, { unitValue: v === '' ? 0 : Number(v) || 0 })} />
          <TextField label="Commodity code (HS code)" placeholder="e.g. 610910" value={item.hsCode ?? ''} onChangeText={(v) => update(item.id, { hsCode: v })} />
          <Text style={styles.hint}>Not sure? Search Google for e.g. &quot;HS code for [item]&quot; and type the number here.</Text>
        </View>
      ))}
      <Pressable style={styles.addButton} onPress={addItem}>
        <Plus size={18} color={colors.green} />
        <Text style={styles.addButtonText}>Add another item</Text>
      </Pressable>
    </WizardScreen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  removeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  hint: { color: colors.muted, fontSize: 13 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderStyle: 'dashed', borderColor: '#aab8b1', borderRadius: radius.md },
  addButtonText: { color: colors.green, fontWeight: '700' },
})
