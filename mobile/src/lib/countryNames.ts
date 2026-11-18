import { countries } from './countries'
import type { Lang } from './i18n'

// Danish names for the countries customers send to most. Any country not listed here keeps its
// English name from countries.ts.
const DA: Record<string, string> = {
  DK: 'Danmark', SE: 'Sverige', NO: 'Norge', FI: 'Finland', IS: 'Island', DE: 'Tyskland', NL: 'Holland',
  BE: 'Belgien', LU: 'Luxembourg', FR: 'Frankrig', ES: 'Spanien', PT: 'Portugal', IT: 'Italien',
  AT: 'Østrig', CH: 'Schweiz', LI: 'Liechtenstein', PL: 'Polen', CZ: 'Tjekkiet', SK: 'Slovakiet',
  HU: 'Ungarn', SI: 'Slovenien', HR: 'Kroatien', BA: 'Bosnien-Hercegovina', RS: 'Serbien',
  ME: 'Montenegro', MK: 'Nordmakedonien', AL: 'Albanien', GR: 'Grækenland', BG: 'Bulgarien',
  RO: 'Rumænien', MD: 'Moldova', UA: 'Ukraine', BY: 'Hviderusland', RU: 'Rusland', EE: 'Estland',
  LV: 'Letland', LT: 'Litauen', IE: 'Irland', GB: 'Storbritannien', MT: 'Malta', CY: 'Cypern',
  TR: 'Tyrkiet', US: 'USA', CA: 'Canada', AU: 'Australien', NZ: 'New Zealand', CN: 'Kina',
  JP: 'Japan', KR: 'Sydkorea', IN: 'Indien', TH: 'Thailand', VN: 'Vietnam', PH: 'Filippinerne',
  PK: 'Pakistan', IR: 'Iran', IQ: 'Irak', SY: 'Syrien', LB: 'Libanon', IL: 'Israel', EG: 'Egypten',
  MA: 'Marokko', TN: 'Tunesien', DZ: 'Algeriet', ZA: 'Sydafrika', BR: 'Brasilien', AR: 'Argentina',
  MX: 'Mexico', AE: 'Forenede Arabiske Emirater', SA: 'Saudi-Arabien', SO: 'Somalia',
  AF: 'Afghanistan', NG: 'Nigeria', KE: 'Kenya', ET: 'Etiopien', GH: 'Ghana', ID: 'Indonesien',
  MY: 'Malaysia', SG: 'Singapore', HK: 'Hongkong', TW: 'Taiwan', LK: 'Sri Lanka', BD: 'Bangladesh',
  NP: 'Nepal', CL: 'Chile', CO: 'Colombia', PE: 'Peru', CU: 'Cuba', VA: 'Vatikanstaten',
  MC: 'Monaco', SM: 'San Marino', AD: 'Andorra', GE: 'Georgien', AM: 'Armenien', AZ: 'Aserbajdsjan',
  KZ: 'Kasakhstan', JO: 'Jordan', KW: 'Kuwait', QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', YE: 'Yemen',
  ER: 'Eritrea', SD: 'Sudan', LY: 'Libyen',
}

// Shown first in the country list, so the usual destinations are one tap away.
export const POPULAR_COUNTRIES = ['DK', 'SE', 'NO', 'DE', 'GB', 'NL', 'FR', 'ES', 'IT', 'PL', 'US']

const ENGLISH: Record<string, string> = Object.fromEntries(countries.map((c) => [c.code, c.name]))

export function englishCountryName(code: string): string {
  return ENGLISH[code] ?? code
}

export function localCountryName(code: string, lang: Lang): string {
  return (lang === 'da' ? DA[code] : undefined) ?? englishCountryName(code)
}

// Both names, so a search for "Tyskland" or "Germany" finds the same country in either language.
export function countrySearchText(code: string): string {
  return `${DA[code] ?? ''} ${englishCountryName(code)} ${code}`
}
