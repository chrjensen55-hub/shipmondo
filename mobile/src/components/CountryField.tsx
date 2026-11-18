import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { ListSheet, type ListSheetItem } from './ListSheet'
import { countries } from '@/lib/countries'
import { POPULAR_COUNTRIES, countrySearchText, localCountryName } from '@/lib/countryNames'
import { flagEmoji } from '@/lib/dialCodes'
import { useLang, useLangCode } from '@/lib/i18n'

// The country is the first thing chosen on an address, so the field is larger than a normal input
// and shows the flag. Tapping it opens a searchable list with the most used countries on top.
export function CountryField({ label, value, onChange, error }: { label: string; value: string; onChange: (code: string) => void; error?: string }) {
  const tr = useLang()
  const lang = useLangCode()
  const [open, setOpen] = useState(false)

  const items = useMemo<ListSheetItem[]>(
    () =>
      countries
        .map((c) => ({ value: c.code, label: localCountryName(c.code, lang), leading: flagEmoji(c.code), searchText: countrySearchText(c.code) }))
        .sort((a, b) => a.label.localeCompare(b.label, lang)),
    [lang],
  )

  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-medium text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${localCountryName(value, lang)}`}
        onPress={() => setOpen(true)}
        className={`min-h-[56px] flex-row items-center gap-3 rounded-[8px] border-[1.5px] bg-white px-3.5 active:bg-cream ${error ? 'border-error' : 'border-ocean'}`}
      >
        <Text className="text-2xl">{flagEmoji(value)}</Text>
        <Text className="flex-1 text-base font-semibold text-ink">{localCountryName(value, lang)}</Text>
        <Text className="text-[13px] font-medium text-ocean">{tr.changeAction}</Text>
        <ChevronDown size={18} color="#0B4F82" />
      </Pressable>
      {error ? (
        <Text className="text-xs text-error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <ListSheet
        visible={open}
        title={tr.chooseCountry}
        items={items}
        selectedValue={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
        searchable
        pinnedValues={POPULAR_COUNTRIES}
        pinnedTitle={tr.popularCountries}
        restTitle={tr.allCountries}
      />
    </View>
  )
}
