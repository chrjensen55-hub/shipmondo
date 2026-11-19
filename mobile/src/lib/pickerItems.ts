import type { ListSheetItem } from '@/components/ListSheet'
import { countries } from './countries'
import { countrySearchText, localCountryName } from './countryNames'
import { dialCodes, flagEmoji } from './dialCodes'
import type { Lang } from './i18n'

// The rows of the country picker and of the phone code picker, sorted by name.
//
// They used to be sorted with localeCompare each time an address step opened. On Android that is
// very slow (every comparison goes through the system's language rules), and it froze the app for
// a moment on the way into the sender and recipient steps. Here each list is sorted once per
// language with plain text keys, then kept.

const ACCENTS: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i',
  ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y',
}

function sortKey(label: string, lang: Lang): string {
  let key = label.toLowerCase()
  // In the Danish alphabet æ, ø and å come after z. '{', '|' and '}' are the characters after 'z'.
  if (lang === 'da') key = key.replace(/æ/g, '{').replace(/ø/g, '|').replace(/å/g, '}')
  // Other accented letters sort as their plain letter (Åland under A in English, Côte under C).
  return key.replace(/[à-ý]/g, (char) => ACCENTS[char] ?? char)
}

function sortedByLabel(items: ListSheetItem[], lang: Lang): ListSheetItem[] {
  return items
    .map((item) => ({ item, key: sortKey(item.label, lang) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((entry) => entry.item)
}

const countryCache: Partial<Record<Lang, ListSheetItem[]>> = {}
const dialCodeCache: Partial<Record<Lang, ListSheetItem[]>> = {}

export function countryItems(lang: Lang): ListSheetItem[] {
  return (countryCache[lang] ??= sortedByLabel(
    countries.map((c) => ({ value: c.code, label: localCountryName(c.code, lang), leading: flagEmoji(c.code), searchText: countrySearchText(c.code) })),
    lang,
  ))
}

export function dialCodeItems(lang: Lang): ListSheetItem[] {
  return (dialCodeCache[lang] ??= sortedByLabel(
    dialCodes.map((d) => ({ value: d.code, label: localCountryName(d.code, lang), leading: d.flag, trailing: d.dial, searchText: countrySearchText(d.code) })),
    lang,
  ))
}
