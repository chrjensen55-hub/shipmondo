import { StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { TextField } from './TextField'
import { PhoneField } from './PhoneField'
import { countries } from '@/lib/countries'
import { colors, radius } from '@/lib/theme'
import type { Address } from '@/lib/types'

export function AddressForm({ value, onChange, minimal = false }: { value: Address; onChange: (key: keyof Address, v: string) => void; minimal?: boolean }) {
  return (
    <View style={styles.fields}>
      <TextField label="Full name" value={value.fullName} onChangeText={(v) => onChange('fullName', v)} />
      {!minimal && <TextField label="Company (optional)" value={value.company ?? ''} onChangeText={(v) => onChange('company', v)} />}
      <TextField label="Address line 1" value={value.address1} onChangeText={(v) => onChange('address1', v)} />
      {!minimal && <TextField label="Address line 2 (optional)" value={value.address2 ?? ''} onChangeText={(v) => onChange('address2', v)} />}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextField label="Postal code" value={value.postalCode} onChangeText={(v) => onChange('postalCode', v)} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="City" value={value.city} onChangeText={(v) => onChange('city', v)} />
        </View>
      </View>
      <View>
        <Text style={styles.label}>Country</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={value.country} onValueChange={(v) => onChange('country', v)}>
            {countries.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} />
            ))}
          </Picker>
        </View>
      </View>
      <TextField label="Email" value={value.email} onChangeText={(v) => onChange('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <PhoneField label="Mobile phone" value={value.phone} onChange={(v) => onChange('phone', v)} />
    </View>
  )
}

const styles = StyleSheet.create({
  fields: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white },
})
