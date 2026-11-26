import { z } from 'zod'
import type { ShipmentItem } from './types'

// What a price request and a booking request must contain. When something is wrong, the answer
// names the field, so the screen can say what to fix instead of "please check the details".
//
// The tablet app applies the same rules to the typed fields before it asks the server
// (mobile/src/lib/addressRules.ts). validation.test.ts keeps the two in step.

// Standard e-mail shape: letters, digits and . _ ' + - before the @, and a domain with a dot.
export const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/
// Shortest accepted text per address field, counted after spaces at the ends are removed.
export const MIN_LENGTH = { fullName: 2, address1: 3, postalCode: 2, city: 2, phone: 6 } as const

// Spaces at the ends never count: a space typed after an e-mail address must not refuse a parcel.
const text = (min: number) => z.string().trim().min(min)
const optionalText = z.string().trim().nullish().transform((value) => value || undefined)

const address = z.object({
  fullName: text(MIN_LENGTH.fullName),
  company: optionalText,
  address1: text(MIN_LENGTH.address1),
  address2: optionalText,
  postalCode: text(MIN_LENGTH.postalCode),
  city: text(MIN_LENGTH.city),
  country: z.string().trim().length(2),
  state: optionalText,
  email: z.string().trim().regex(EMAIL_PATTERN),
  phone: text(MIN_LENGTH.phone),
  instructions: z.string().trim().max(300).nullish().transform((value) => value || undefined),
})

const parcel = z.object({ id: z.string(), weight: z.number().positive(), length: z.number().positive(), width: z.number().positive(), height: z.number().positive() })
const locationRateBracket = z.object({ maxWeight: z.number().positive(), service_point: z.number().nonnegative().nullable(), home: z.number().nonnegative() })

// A price needs the route, the parcels and both addresses. It does not depend on the customs
// lines, so those are not looked at here: a half-filled customs line must never block a price.
const quoteSchema = z.object({
  originCountry: z.string().trim().length(2),
  originPostalCode: text(MIN_LENGTH.postalCode),
  destinationCountry: z.string().trim().length(2),
  destinationPostalCode: text(MIN_LENGTH.postalCode),
  carrierName: z.string().trim().min(1),
  deliveryLocation: z.enum(['home', 'service_point', 'business']),
  parcels: z.array(parcel).min(1),
  locationRates: z.array(locationRateBracket).nullish().transform((value) => value ?? undefined),
  sender: address,
  recipient: address,
  // Older app versions can still send this for PostNord's registered letter, which is no longer sold.
  registeredLetter: z.boolean().nullish(),
})

// A booking adds the chosen price and the customer's confirmation. The customs lines are kept as
// sent and only checked (customsItemsSchema) when the destination needs a customs declaration.
const shipmentSchema = quoteSchema.extend({
  contentsType: z.enum(['DOCUMENTS', 'GOODS']).default('GOODS'),
  items: z.array(z.unknown()).nullish().transform((value) => value ?? []),
  exportReason: z.string().nullish().transform((value) => value || undefined),
  selectedQuoteId: z.string().min(1),
  confirmation: z.literal(true),
  idempotencyKey: z.string().min(8),
})

const customsItemsSchema = z
  .array(
    z.object({
      id: z.string(),
      description: text(2),
      quantity: z.number().int().positive(),
      unitValue: z.number().nonnegative(),
      currency: z.string().length(3),
      weight: z.number().positive(),
      originCountry: z.string().length(2),
      hsCode: z.string().trim().regex(/^\d{6}(\d{2}){0,3}$/),
    }),
  )
  .min(1)

export type QuoteInput = z.infer<typeof quoteSchema>
export type ShipmentInput = z.infer<typeof shipmentSchema>
export type FieldProblem = { path: string; problem: 'missing' | 'too_short' | 'invalid' }
export type Parsed<T> = { ok: true; data: T } | { ok: false; problems: FieldProblem[] }

// The route fields repeat what is typed in the two address forms, so a problem with one of them
// is reported as the address field the customer can see.
const SAME_AS: Record<string, string> = {
  originCountry: 'sender.country',
  originPostalCode: 'sender.postalCode',
  destinationCountry: 'recipient.country',
  destinationPostalCode: 'recipient.postalCode',
}

function valueAt(body: unknown, path: PropertyKey[]): unknown {
  let value = body
  for (const key of path) {
    if (value === null || typeof value !== 'object') return undefined
    value = (value as Record<PropertyKey, unknown>)[key]
  }
  return value
}

function toProblems(error: z.ZodError, body: unknown, prefix: string[] = []): FieldProblem[] {
  const problems = new Map<string, FieldProblem>()
  for (const issue of error.issues) {
    const raw = [...prefix, ...issue.path].join('.')
    const path = SAME_AS[raw] ?? raw
    if (problems.has(path)) continue
    const value = valueAt(body, issue.path)
    const empty = value === undefined || value === null || value === 0 || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)
    problems.set(path, { path, problem: empty ? 'missing' : issue.code === 'too_small' ? 'too_short' : 'invalid' })
  }
  return [...problems.values()]
}

function parseWith<T>(schema: z.ZodType<T>, body: unknown, prefix: string[] = []): Parsed<T> {
  const result = schema.safeParse(body)
  return result.success ? { ok: true, data: result.data } : { ok: false, problems: toProblems(result.error, body, prefix) }
}

export const parseQuoteRequest = (body: unknown) => parseWith(quoteSchema, body)
export const parseShipmentRequest = (body: unknown) => parseWith(shipmentSchema, body)
export const parseCustomsItems = (items: unknown[]): Parsed<ShipmentItem[]> => parseWith(customsItemsSchema, items, ['items'])

const PARTY: Record<string, string> = { sender: 'Sender', recipient: 'Recipient' }
const ADDRESS_FIELD: Record<string, string> = {
  fullName: 'full name',
  company: 'company name',
  address1: 'address',
  address2: 'second address line',
  postalCode: 'postal code',
  city: 'city',
  country: 'country',
  state: 'state or region',
  email: 'e-mail',
  phone: 'phone number',
  instructions: 'delivery note',
}
const CUSTOMS_FIELD: Record<string, string> = {
  description: 'description',
  quantity: 'quantity',
  unitValue: 'value',
  currency: 'currency',
  weight: 'weight',
  originCountry: 'country of origin',
  hsCode: 'commodity code (6, 8, 10 or 12 digits)',
}

function sentence({ path, problem }: FieldProblem): string {
  const [first, second, third] = path.split('.')
  if (PARTY[first] && second) {
    const field = ADDRESS_FIELD[second] ?? second
    if (problem === 'missing') return `${PARTY[first]}: the ${field} is missing.`
    if (problem === 'too_short') return `${PARTY[first]}: the ${field} is too short.`
    if (second === 'email') return `${PARTY[first]}: the e-mail is not a valid e-mail address (example: name@mail.dk).`
    return `${PARTY[first]}: the ${field} is not valid.`
  }
  if (first === 'parcels') return second === undefined ? 'No parcel is chosen. Go back to the parcel step.' : `Parcel ${Number(second) + 1}: the weight or size is missing. Go back to the parcel step.`
  if (first === 'items') {
    if (second === undefined) return 'This country needs customs details. Fill in the customs step.'
    return `Customs line ${Number(second) + 1}: the ${CUSTOMS_FIELD[third] ?? 'details'} ${problem === 'missing' ? 'is missing' : 'is not valid'}.`
  }
  if (first === 'locationRates') return "This location's price list has an empty or wrong price. Correct it in Admin → Settings → Location."
  if (first === 'carrierName') return 'No carrier is chosen. Go back to the first step.'
  if (first === 'deliveryLocation') return 'No delivery choice is made. Go back to the delivery step.'
  if (first === 'selectedQuoteId') return 'No price is chosen. Go back one step and continue again.'
  if (first === 'confirmation') return 'Tick the box that confirms the details.'
  if (path === '') return 'The request could not be read. Tap Refresh in the menu and start again.'
  return `A detail could not be used (${path}). Tap Refresh in the menu and start again.`
}

// One short text for the screen. Parcel and customs problems are told once per parcel or line.
export function describeProblems(problems: FieldProblem[]): string {
  const sentences = [...new Set(problems.map(sentence))]
  const shown = sentences.slice(0, 3).join(' ')
  return sentences.length > 3 ? `${shown} And ${sentences.length - 3} more.` : shown
}
