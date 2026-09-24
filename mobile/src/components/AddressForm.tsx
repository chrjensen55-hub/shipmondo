import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Check } from 'lucide-react-native'
import { TextField } from './TextField'
import { PhoneField } from './PhoneField'
import { countries } from '@/lib/countries'
import { useLang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'
import type { Address } from '@/lib/types'

export function AddressForm({
  value,
  onChange,
  minimal = false,
  noContact,
  onToggleNoContact,
}: {
  value: Address
  onChange: (key: keyof Address, v: string) => void
  minimal?: boolean
  // Recipient-only: lets staff skip requiring the recipient's own email/phone (common for
  // walk-in customers sending on someone else's behalf who don't have those details) and use the
  // sender's instead, since Shipmondo still needs a valid contact on the recipient party.
  noContact?: boolean
  onToggleNoContact?: (checked: boolean) => void
}) {
  const tr = useLang()
  const showNoContactOption = onToggleNoContact !== undefined
  return (
    <View style={styles.fields}>
      <TextField label={tr.fullName} value={value.fullName} onChangeText={(v) => onChange('fullName', v)} />
      {!minimal && <TextField label={`${tr.company} (${tr.optional})`} value={value.company ?? ''} onChangeText={(v) => onChange('company', v)} />}
      <TextField label={tr.addressLine1} value={value.address1} onChangeText={(v) => onChange('address1', v)} />
      {!minimal && <TextField label={`${tr.addressLine2} (${tr.optional})`} value={value.address2 ?? ''} onChangeText={(v) => onChange('address2', v)} />}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextField label={tr.postalCode} value={value.postalCode} onChangeText={(v) => onChange('postalCode', v)} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={tr.city} value={value.city} onChangeText={(v) => onChange('city', v)} />
        </View>
      </View>
      <View>
        <Text style={styles.label}>{tr.country}</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={value.country} onValueChange={(v) => onChange('country', v)}>
            {countries.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} />
            ))}
          </Picker>
        </View>
      </View>
      {showNoContactOption && (
        <Pressable style={styles.noContactRow} onPress={() => onToggleNoContact?.(!noContact)}>
          <View style={[styles.checkbox, noContact && styles.checkboxChecked]}>{noContact && <Check size={14} color={colors.white} />}</View>
          <Text style={styles.noContactText}>{tr.noRecipientContact}</Text>
        </Pressable>
      )}
      <TextField label={tr.email} value={value.email} onChangeText={(v) => onChange('email', v)} keyboardType="email-address" autoCapitalize="none" editable={!noContact} />
      <PhoneField label={tr.mobilePhone} value={value.phone} onChange={(v) => onChange('phone', v)} editable={!noContact} />
      {noContact && <Text style={styles.noContactNote}>{tr.noRecipientContactNote}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  fields: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white },
  noContactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.ocean, borderColor: colors.ocean },
  noContactText: { flex: 1, color: colors.ink, fontSize: 14 },
  noContactNote: { color: colors.muted, fontSize: 12, marginTop: -8 },
})
