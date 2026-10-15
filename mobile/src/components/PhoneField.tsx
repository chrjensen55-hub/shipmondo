import { useState, type Ref } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { useEnsureVisible } from './KeyboardAwareScreen'
import { dialCodes, joinPhone, splitPhone, DEFAULT_DIAL_CODE } from '@/lib/dialCodes'
import { useLang } from '@/lib/i18n'

export function PhoneField({
  label,
  value,
  onChange,
  editable = true,
  inputRef,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editable?: boolean
  inputRef?: Ref<TextInput>
  returnKeyType?: 'next' | 'done'
  onSubmitEditing?: () => void
}) {
  const tr = useLang()
  const ensureVisible = useEnsureVisible()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const { countryCode, local } = splitPhone(value)
  const current = dialCodes.find((d) => d.code === countryCode) ?? dialCodes.find((d) => d.code === DEFAULT_DIAL_CODE)!

  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-medium text-ink">{label}</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr.countryCodeSheetTitle}
          disabled={!editable}
          onPress={() => setPickerOpen(true)}
          className={`min-h-[48px] flex-row items-center gap-1 rounded-[8px] border-[1.5px] border-line px-3 ${editable ? 'bg-white' : 'bg-[#EEF2F6] opacity-60'}`}
        >
          <Text className="text-lg">{current.flag}</Text>
          <Text className="text-[15px] font-semibold text-ink">{current.dial}</Text>
          <ChevronDown size={14} color="#6B7280" />
        </Pressable>
        <TextInput
          ref={inputRef}
          className={`min-h-[48px] flex-1 rounded-[8px] border-[1.5px] px-3.5 text-[15px] text-ink ${focused ? 'border-ocean' : 'border-line'} ${editable ? 'bg-white' : 'bg-[#EEF2F6] opacity-60'}`}
          value={local}
          onChangeText={(v) => onChange(joinPhone(countryCode, v))}
          keyboardType="phone-pad"
          returnKeyType={returnKeyType ?? 'done'}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={onSubmitEditing && returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
          onFocus={() => {
            setFocused(true)
            ensureVisible()
          }}
          onBlur={() => setFocused(false)}
          placeholder="12345678"
          placeholderTextColor="#6B7280"
          editable={editable}
          accessibilityLabel={label}
        />
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setPickerOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-lg bg-white pt-4" onPress={(e) => e.stopPropagation()}>
            <Text className="px-5 pb-2 text-lg font-bold text-ink">{tr.countryCodeSheetTitle}</Text>
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
                  <View className="flex-shrink flex-row items-center gap-2">
                    <Text className="text-lg">{item.flag}</Text>
                    <Text className="flex-shrink text-base text-ink">{item.name}</Text>
                  </View>
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
