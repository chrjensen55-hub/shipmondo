import { StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { TextField } from './TextField'
import { PhoneField } from './PhoneField'
import { countries } from '@/lib/countries'
import { useLang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'
import type { Address } from '@/lib/types'

export function AddressForm({ value, onChange, minimal = false }: { value: Address; onChange: (key: keyof Address, v: string) => void; minimal?: boolean }) {
  const tr = useLang()
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
      <TextField label={tr.email} value={value.email} onChangeText={(v) => onChange('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <PhoneField label={tr.mobilePhone} value={value.phone} onChange={(v) => onChange('phone', v)} />
    </View>
  )
}

const styles = StyleSheet.create({
  fields: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white },
})
