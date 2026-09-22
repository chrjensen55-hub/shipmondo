import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { WizardScreen } from '@/components/WizardScreen'
import { TextField } from '@/components/TextField'
import { useWizard, HS_CODE_RE } from '@/lib/wizard-context'
import { colors, radius } from '@/lib/theme'

export default function CustomsStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const item = draft.items[0]

  useEffect(() => {
    if (!item) {
      setDraft((d) => ({
        ...d,
        items: [{ id: 'customs-item', description: '', quantity: 1, unitValue: 0, currency: 'DKK', weight: d.parcels[0]?.weight ?? 1, originCountry: d.originCountry, hsCode: '' }],
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(patch: Partial<NonNullable<typeof item>>) {
    setDraft((d) => ({ ...d, items: d.items.length ? [{ ...d.items[0], ...patch }] : d.items }))
  }

  const valid = Boolean(item && item.description.trim().length > 1 && HS_CODE_RE.test(item.hsCode ?? '') && item.unitValue > 0)

  return (
    <WizardScreen title="What's inside?" subtitle="The carrier requires a customs declaration for this destination." onContinue={() => router.push('/send/review')} continueDisabled={!valid}>
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
      <TextField label="Contents description" value={item?.description ?? ''} onChangeText={(v) => update({ description: v })} />
      <TextField label="Value (DKK)" keyboardType="numeric" value={item?.unitValue ? String(item.unitValue) : ''} onChangeText={(v) => update({ unitValue: v === '' ? 0 : Number(v) || 0 })} />
      <TextField label="Commodity code (HS code)" placeholder="e.g. 610910" value={item?.hsCode ?? ''} onChangeText={(v) => update({ hsCode: v })} />
      <Text style={styles.hint}>Not sure? Search Google for e.g. &quot;HS code for [item]&quot; and type the number here.</Text>
    </WizardScreen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white },
  hint: { color: colors.muted, fontSize: 13 },
})
