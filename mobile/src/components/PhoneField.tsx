import { useState, type Ref } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { useEnsureVisible } from './KeyboardAwareScreen'
import { ListSheet } from './ListSheet'
import { dialCodes, joinPhone, splitPhone, DEFAULT_DIAL_CODE } from '@/lib/dialCodes'
import { POPULAR_COUNTRIES } from '@/lib/countryNames'
import { dialCodeItems } from '@/lib/pickerItems'
import { useLang, useLangCode } from '@/lib/i18n'

export function PhoneField({
  label,
  value,
  onChange,
  editable = true,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  countryHint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editable?: boolean
  inputRef?: Ref<TextInput>
  returnKeyType?: 'next' | 'done'
  onSubmitEditing?: () => void
  // The address country. Several countries share one code (+1, +7); when the number's code matches
  // this country, its flag is shown instead of the first country with that code.
  countryHint?: string
}) {
  const tr = useLang()
  const lang = useLangCode()
  const ensureVisible = useEnsureVisible()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const { countryCode, local } = splitPhone(value)
  const parsed = dialCodes.find((d) => d.code === countryCode) ?? dialCodes.find((d) => d.code === DEFAULT_DIAL_CODE)!
  const hinted = countryHint ? dialCodes.find((d) => d.code === countryHint) : undefined
  const current = hinted && hinted.dial === parsed.dial ? hinted : parsed

  const items = dialCodeItems(lang)

  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-medium text-ink">{label}</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${tr.countryCodeSheetTitle}: ${current.dial}`}
          disabled={!editable}
          onPress={() => setPickerOpen(true)}
          className={`min-h-[48px] flex-row items-center gap-1 rounded-[8px] border-[1.5px] border-line px-3 ${editable ? 'bg-white active:bg-cream' : 'bg-[#EEF2F6] opacity-60'}`}
        >
          <Text className="text-lg">{current.flag}</Text>
          <Text className="text-[15px] font-semibold text-ink">{current.dial}</Text>
          <ChevronDown size={14} color="#6B7280" />
        </Pressable>
        <TextInput
          ref={inputRef}
          className={`min-h-[48px] flex-1 rounded-[8px] border-[1.5px] px-3.5 text-[15px] text-ink ${focused ? 'border-ocean' : 'border-line'} ${editable ? 'bg-white' : 'bg-[#EEF2F6] opacity-60'}`}
          value={local}
          onChangeText={(v) => onChange(joinPhone(current.code, v))}
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

      <ListSheet
        visible={pickerOpen}
        title={tr.countryCodeSheetTitle}
        items={items}
        selectedValue={current.code}
        onSelect={(code) => onChange(joinPhone(code, local))}
        onClose={() => setPickerOpen(false)}
        searchable
        pinnedValues={POPULAR_COUNTRIES}
        pinnedTitle={tr.popularCountries}
        restTitle={tr.allCountries}
      />
    </View>
  )
}
