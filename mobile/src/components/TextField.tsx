import { useState, type Ref } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { useEnsureVisible } from './KeyboardAwareScreen'

type Props = TextInputProps & { label: string; error?: string; inputRef?: Ref<TextInput> }

// Label sits above the field and the input is a fixed, touch-friendly height. The border turns
// navy while focused so the active field is always obvious, and red with a plain-language message
// when there's a validation problem. Focusing a field asks the surrounding screen to scroll it
// above the keyboard.
export function TextField({ label, error, inputRef, onFocus, onBlur, editable = true, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const ensureVisible = useEnsureVisible()
  const border = error ? 'border-error' : focused ? 'border-ocean' : 'border-line'
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-medium text-ink">{label}</Text>
      <TextInput
        ref={inputRef}
        className={`min-h-[48px] rounded-[8px] border-[1.5px] px-3.5 text-[15px] text-ink ${border} ${editable ? 'bg-white' : 'bg-[#EEF2F6] opacity-60'}`}
        placeholderTextColor="#6B7280"
        editable={editable}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true)
          ensureVisible()
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...rest}
      />
      {error ? <Text className="text-xs text-error">{error}</Text> : null}
    </View>
  )
}
