import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { dialCodes, joinPhone, splitPhone, DEFAULT_DIAL_CODE } from '@/lib/dialCodes'
import { useLang } from '@/lib/i18n'

export function PhoneField({ label, value, onChange, editable = true }: { label: string; value: string; onChange: (v: string) => void; editable?: boolean }) {
  const tr = useLang()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { countryCode, local } = splitPhone(value)
  const current = dialCodes.find((d) => d.code === countryCode) ?? dialCodes.find((d) => d.code === DEFAULT_DIAL_CODE)!

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr.countryCodeSheetTitle}
          disabled={!editable}
          onPress={() => setPickerOpen(true)}
          className={`min-h-[52px] flex-row items-center gap-1 rounded-sm border-[1.5px] border-line bg-white px-3 ${editable ? '' : 'opacity-60'}`}
        >
          <Text className="text-base font-bold text-ink">{current.dial}</Text>
          <ChevronDown size={14} color="#5c7080" />
        </Pressable>
        <TextInput
          className={`min-h-[52px] flex-1 rounded-sm border-[1.5px] border-line bg-white px-3.5 text-base text-ink ${editable ? '' : 'bg-cream opacity-60'}`}
          value={local}
          onChangeText={(v) => onChange(joinPhone(countryCode, v))}
          keyboardType="phone-pad"
          placeholder="12345678"
          placeholderTextColor="#5c7080"
          editable={editable}
          accessibilityLabel={label}
        />
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setPickerOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-lg bg-white pt-4" onPress={(e) => e.stopPropagation()}>
            <Text className="px-5 pb-2 text-lg font-extrabold text-ink">{tr.countryCodeSheetTitle}</Text>
            <FlatList
              data={dialCodes}
              keyExtractor={(d) => d.code}
              className="px-2"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  className="flex-row items-center justify-between border-b border-line px-3 py-3.5 active:bg-cream"
                  onPress={() => {
                    onChange(joinPhone(item.code, local))
                    setPickerOpen(false)
                  }}
                >
                  <Text className="flex-shrink text-base text-ink">{item.name}</Text>
                  <Text className="font-bold text-muted">{item.dial}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
