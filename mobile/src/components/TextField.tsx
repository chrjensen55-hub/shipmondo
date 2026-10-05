import { useState } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'

type Props = TextInputProps & { label: string; error?: string }

// Label sits above the field and the input is a fixed, touch-friendly height. The border turns
// ocean while focused so the active field is always obvious, and red with a plain-language message
// when there's a validation problem.
export function TextField({ label, error, onFocus, onBlur, editable = true, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const border = error ? 'border-error' : focused ? 'border-ocean' : 'border-line'
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <TextInput
        className={`min-h-[52px] rounded-sm border-[1.5px] bg-white px-3.5 text-base text-ink ${border} ${editable ? '' : 'bg-cream opacity-60'}`}
        placeholderTextColor="#5c7080"
        editable={editable}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...rest}
      />
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  )
}
