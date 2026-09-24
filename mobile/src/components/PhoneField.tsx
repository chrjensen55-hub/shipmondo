import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { dialCodes, joinPhone, splitPhone, DEFAULT_DIAL_CODE } from '@/lib/dialCodes'
import { useLang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'

export function PhoneField({ label, value, onChange, editable = true }: { label: string; value: string; onChange: (v: string) => void; editable?: boolean }) {
  const tr = useLang()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { countryCode, local } = splitPhone(value)
  const current = dialCodes.find((d) => d.code === countryCode) ?? dialCodes.find((d) => d.code === DEFAULT_DIAL_CODE)!

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.dialButton, !editable && styles.disabled]} onPress={() => editable && setPickerOpen(true)} disabled={!editable}>
          <Text style={styles.dialText}>{current.dial}</Text>
          <ChevronDown size={14} color={colors.muted} />
        </Pressable>
        <TextInput
          style={[styles.input, !editable && styles.disabled]}
          value={local}
          onChangeText={(v) => onChange(joinPhone(countryCode, v))}
          keyboardType="phone-pad"
          placeholder="12345678"
          placeholderTextColor={colors.muted}
          editable={editable}
        />
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{tr.countryCodeSheetTitle}</Text>
            <FlatList
              data={dialCodes}
              keyExtractor={(d) => d.code}
              style={styles.sheetList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(joinPhone(item.code, local))
                    setPickerOpen(false)
                  }}
                >
                  <Text style={styles.optionName}>{item.name}</Text>
                  <Text style={styles.optionDial}>{item.dial}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  dialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  dialText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 16, color: colors.ink, backgroundColor: colors.white },
  disabled: { backgroundColor: colors.cream, opacity: 0.6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 36, 54, 0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '70%', paddingTop: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, paddingHorizontal: 20, paddingBottom: 8 },
  sheetList: { paddingHorizontal: 8 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  optionName: { color: colors.ink, fontSize: 15, flexShrink: 1, marginRight: 8 },
  optionDial: { color: colors.muted, fontWeight: '700' },
})
