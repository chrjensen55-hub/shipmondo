import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Keyboard, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Check, Search, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLang } from '@/lib/i18n'

export type ListSheetItem = {
  value: string
  label: string
  // Shown before the label, e.g. a flag.
  leading?: string
  // Shown at the right edge, e.g. a dial code.
  trailing?: string
  // Extra words the search should match besides the label.
  searchText?: string
}

type Row = { key: string; header: string } | { key: string; item: ListSheetItem }

type Props = {
  visible: boolean
  title: string
  items: ListSheetItem[]
  selectedValue?: string
  onSelect: (value: string) => void
  onClose: () => void
  // Adds a search box above the list. Worth it for long lists such as countries.
  searchable?: boolean
  // Values listed first under their own heading while nothing is typed in the search box.
  pinnedValues?: string[]
  pinnedTitle?: string
  restTitle?: string
}

const fold = (text: string) => text.toLowerCase().trim()

// One list picker for the whole app: a sheet that slides up from the bottom, with large rows that
// are easy to tap and an optional search box. The sheet is tall and the search box sits at its top,
// so the box and the first results stay visible above the on-screen keyboard.
export function ListSheet({ visible, title, items, selectedValue, onSelect, onClose, searchable = false, pinnedValues, pinnedTitle, restTitle }: Props) {
  const tr = useLang()
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<View>(null)
  const [query, setQuery] = useState('')
  const [keyboardOverlap, setKeyboardOverlap] = useState(0)

  useEffect(() => {
    if (!visible) return
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      sheetRef.current?.measureInWindow((_x, y, _w, h) => setKeyboardOverlap(Math.max(0, y + h - e.endCoordinates.screenY)))
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOverlap(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [visible])

  const rows = useMemo<Row[]>(() => {
    const q = fold(query)
    if (q) {
      const matches = items.filter((item) => fold(`${item.label} ${item.searchText ?? ''} ${item.trailing ?? ''}`).includes(q))
      // Names that start with what was typed come before names that only contain it.
      const starts = (item: ListSheetItem) => (fold(item.label).startsWith(q) ? 0 : 1)
      return [...matches].sort((a, b) => starts(a) - starts(b)).map((item) => ({ key: `s-${item.value}`, item }))
    }
    const pinned = (pinnedValues ?? []).map((value) => items.find((item) => item.value === value)).filter((item): item is ListSheetItem => !!item)
    if (!pinned.length) return items.map((item) => ({ key: `a-${item.value}`, item }))
    return [
      ...(pinnedTitle ? [{ key: 'h-pinned', header: pinnedTitle }] : []),
      ...pinned.map((item) => ({ key: `p-${item.value}`, item })),
      ...(restTitle ? [{ key: 'h-rest', header: restTitle }] : []),
      ...items.map((item) => ({ key: `a-${item.value}`, item })),
    ]
  }, [items, pinnedValues, pinnedTitle, restTitle, query])

  function close() {
    setQuery('')
    setKeyboardOverlap(0)
    onClose()
  }

  function choose(value: string) {
    onSelect(value)
    close()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable className="flex-1 justify-end bg-ink/40" onPress={close} accessibilityRole="none">
        <Pressable ref={sheetRef} className="h-[88%] w-full max-w-[640px] self-center rounded-t-xl bg-white" onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
          <View className="flex-row items-center justify-between gap-3 px-5 pb-2 pt-4">
            <Text className="flex-1 text-xl font-bold text-ink" accessibilityRole="header">
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={tr.closeAction} onPress={close} hitSlop={8} className="h-11 w-11 items-center justify-center rounded-full bg-cream active:bg-line">
              <X size={20} color="#0F1E33" />
            </Pressable>
          </View>

          {searchable && (
            <View className="mx-5 mb-2 min-h-[48px] flex-row items-center gap-2 rounded-[8px] border-[1.5px] border-line bg-cream px-3.5">
              <Search size={18} color="#6B7280" />
              <TextInput
                className="min-h-[48px] flex-1 text-[15px] text-ink"
                value={query}
                onChangeText={setQuery}
                placeholder={tr.searchPlaceholder}
                placeholderTextColor="#6B7280"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel={tr.searchPlaceholder}
              />
              {query ? (
                <Pressable accessibilityRole="button" accessibilityLabel={tr.clearSearch} onPress={() => setQuery('')} hitSlop={10}>
                  <X size={18} color="#6B7280" />
                </Pressable>
              ) : null}
            </View>
          )}

          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: insets.bottom + keyboardOverlap + 12 }}
            ListEmptyComponent={<Text className="px-4 py-8 text-center text-base text-muted">{tr.noResults}</Text>}
            renderItem={({ item: row }) => {
              if ('header' in row) {
                return <Text className="px-3 pb-1.5 pt-4 text-xs font-bold uppercase text-muted">{row.header}</Text>
              }
              const { item } = row
              const selected = item.value === selectedValue
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.trailing ? `${item.label}, ${item.trailing}` : item.label}
                  onPress={() => choose(item.value)}
                  className={`min-h-[52px] flex-row items-center gap-3 rounded-[8px] px-3 py-2.5 active:bg-cream ${selected ? 'bg-mint' : ''}`}
                >
                  {item.leading ? <Text className="text-2xl">{item.leading}</Text> : null}
                  <Text className={`flex-1 text-base ${selected ? 'font-bold text-ocean' : 'text-ink'}`}>{item.label}</Text>
                  {item.trailing ? <Text className="text-base font-semibold text-muted">{item.trailing}</Text> : null}
                  {selected ? <Check size={18} color="#0B4F82" /> : null}
                </Pressable>
              )
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}
