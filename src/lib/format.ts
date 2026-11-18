// Dates are written the same way on the server and in the browser (fixed language and Danish
// time), so a page never shows one text first and then swaps it for another.
const DATE_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
const LONG_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : DATE_TIME.format(date)
}

export function formatLongDate(date: Date): string {
  return LONG_DATE.format(date)
}

// Shipmondo sends prices as text such as "119.0". Show whole kroner without the ".0".
export function formatPrice(price: string): string {
  const n = Number(price)
  if (!Number.isFinite(n)) return price
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
