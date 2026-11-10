import { useState } from 'react'
import { FlatList, Modal, Platform, Pressable, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Check, ChevronDown } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type SelectOption = { label: string; value: string }

type Props = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  // Heading of the iOS list and the field's accessibility label.
  title: string
  // Corner radius of the field, so it matches the form it sits in.
  radiusClassName?: string
}

// Android keeps its native dropdown. On iPhone/iPad the native picker is a large spinning wheel
// inside the form, so there the field opens a list from the bottom instead, like the phone
// country code picker.
export function SelectField({ value, options, onChange, title, radiusClassName = 'rounded-[8px]' }: Props) {
  if (Platform.OS !== 'ios') {
    return (
      <View className={`overflow-hidden ${radiusClassName} border-[1.5px] border-line bg-white`}>
        <Picker selectedValue={value} onValueChange={(v) => onChange(String(v))}>
          {options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} />
          ))}
        </Picker>
      </View>
    )
  }
  return <SheetSelect value={value} options={options} onChange={onChange} title={title} radiusClassName={radiusClassName} />
}

function SheetSelect({ value, options, onChange, title, radiusClassName }: Props) {
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${current?.label ?? ''}`}
        onPress={() => setOpen(true)}
        className={`min-h-[48px] flex-row items-center justify-between gap-2 ${radiusClassName} border-[1.5px] border-line bg-white px-3.5 active:bg-cream`}
      >
        <Text className="flex-shrink text-[15px] text-ink">{current?.label ?? ''}</Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-lg bg-white pt-4" style={{ paddingBottom: insets.bottom }} onPress={(e) => e.stopPropagation()}>
            <Text className="px-5 pb-2 text-lg font-bold text-ink">{title}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              className="px-2"
              renderItem={({ item }) => {
                const selected = item.value === value
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="flex-row items-center justify-between border-b border-line px-3 py-3.5 active:bg-cream"
                    onPress={() => {
                      onChange(item.value)
                      setOpen(false)
                    }}
                  >
                    <Text className={`flex-shrink text-base ${selected ? 'font-bold text-ocean' : 'text-ink'}`}>{item.label}</Text>
                    {selected ? <Check size={18} color="#0B4F82" /> : null}
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
