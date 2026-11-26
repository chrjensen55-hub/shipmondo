import { ApiError, type FieldProblem } from './api'
import type { AddressProblem } from './addressRules'
import type { useLang } from './i18n'

// Turns "what is wrong" into one short text in the customer's language: for the line above a
// greyed-out Continue, and for the red box when the server could not go on. The reason is always
// said, so nobody has to guess which field to fix.

type Tr = ReturnType<typeof useLang>

function addressLabels(tr: Tr): Record<string, string> {
  return { fullName: tr.fullName, company: tr.company, address1: tr.addressLine1, address2: tr.addressLine2, postalCode: tr.postalCode, city: tr.city, country: tr.country, email: tr.email, phone: tr.mobilePhone }
}

// Empty fields are listed first. When nothing is empty, the first field that is filled in wrongly is named.
export function addressHint(problems: AddressProblem[], tr: Tr): string | undefined {
  if (!problems.length) return undefined
  const labels = addressLabels(tr)
  const missing = problems.filter((p) => p.problem === 'missing')
  if (missing.length) return `${tr.missingPrefix} ${missing.map((p) => labels[p.field]).join(', ')}`
  const first = problems[0]
  if (first.field === 'email') return tr.emailInvalidHint
  return `${labels[first.field]} ${first.problem === 'too_short' ? tr.fieldTooShort : tr.fieldInvalid}`
}

function sentence({ path, problem }: FieldProblem, tr: Tr): string {
  const [first, second, third] = path.split('.')
  if ((first === 'sender' || first === 'recipient') && second) {
    const who = first === 'sender' ? tr.cardSender : tr.cardRecipient
    if (second === 'email' && problem === 'invalid') return `${who}: ${tr.emailInvalidHint}`
    const label = addressLabels(tr)[second] ?? second
    return `${who}: ${label} ${problem === 'missing' ? tr.fieldMissing : problem === 'too_short' ? tr.fieldTooShort : tr.fieldInvalid}`
  }
  if (first === 'parcels') return `${tr.parcelLabel} ${second === undefined ? 1 : Number(second) + 1}: ${tr.problemParcel}`
  if (first === 'items') {
    if (second === undefined) return tr.problemCustomsNeeded
    const label = ({ description: tr.contentsDescription, unitValue: tr.valueDkk, hsCode: tr.commodityCode } as Record<string, string>)[third]
    return label ? `${tr.itemLabel} ${Number(second) + 1}: ${label} ${problem === 'missing' ? tr.fieldMissing : tr.fieldInvalid}` : `${tr.itemLabel} ${Number(second) + 1}: ${tr.customsMissingHint}`
  }
  if (first === 'locationRates') return tr.problemPriceList
  if (first === 'carrierName') return tr.problemCarrier
  return `${tr.problemOther} (${path || '?'}). ${tr.refreshAdvice}`
}

// The text for the red box after a failed price or booking request. `fallback` is only used when
// nothing more exact is known.
export function explainError(err: unknown, tr: Tr, fallback: string): string {
  // The request never got an answer: the tablet could not reach the server.
  if (err instanceof TypeError) return tr.connectionError
  if (!(err instanceof ApiError)) return fallback
  if (err.fields?.length) {
    const sentences = [...new Set(err.fields.map((field) => sentence(field, tr)))]
    return sentences.slice(0, 3).join(' ')
  }
  // The server itself failed (also when it answered with an error page instead of a reason).
  if (err.code === 'SERVER_ERROR' || (!err.code && err.status >= 500)) return tr.serverFaultError
  return err.message || fallback
}
