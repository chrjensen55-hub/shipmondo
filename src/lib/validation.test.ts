import { describe, expect, it } from 'vitest'
import { EMAIL_PATTERN, MIN_LENGTH, describeProblems, parseCustomsItems, parseQuoteRequest, parseShipmentRequest } from './validation'
// The tablet app's own copy of the address rules. It has no React Native code in it, so it can be
// checked here against the server's rules.
import { EMAIL_PATTERN as APP_EMAIL_PATTERN, MIN_LENGTH as APP_MIN_LENGTH, addressProblems } from '../../mobile/src/lib/addressRules'

// What the tablet app sends from the recipient step for an ordinary parcel inside Denmark.
const address = (over: Record<string, unknown> = {}) => ({ fullName: 'Anna Jensen', company: '', address1: 'Gl. Kongevej 163', address2: '', postalCode: '1850', city: 'Frederiksberg C', country: 'DK', email: 'anna@example.dk', phone: '+45 33257725', ...over })
const quote = (over: Record<string, unknown> = {}) => ({
  originCountry: 'DK',
  originPostalCode: '1850',
  destinationCountry: 'DK',
  destinationPostalCode: '2730',
  carrierName: 'GLS',
  deliveryLocation: 'home',
  sender: address(),
  recipient: address({ fullName: 'Mette Hansen', address1: 'Herlev Hovedgade 100', postalCode: '2730', city: 'Herlev' }),
  parcels: [{ id: 'parcel-1', weight: 1, length: 30, width: 20, height: 8 }],
  locationRates: [{ maxWeight: 1, service_point: 89, home: 119 }],
  ...over,
})
const booking = (over: Record<string, unknown> = {}) => ({ ...quote(), contentsType: 'GOODS', items: [], selectedQuoteId: 'quote-gls', confirmation: true, idempotencyKey: 'key-12345678', ...over })
// The empty line the customs step adds when it opens.
const blankCustomsLine = { id: 'item-1', description: '', quantity: 1, unitValue: 0, currency: 'DKK', weight: 1, originCountry: 'DK', hsCode: '' }

const problemsOf = (result: ReturnType<typeof parseQuoteRequest>) => (result.ok ? [] : result.problems)

describe('price request', () => {
  it('accepts an ordinary parcel', () => {
    expect(parseQuoteRequest(quote()).ok).toBe(true)
  })

  it('is not stopped by an empty customs line left over from an earlier try', () => {
    // Before: refused with "Please check the shipment details." until the app was refreshed.
    expect(parseQuoteRequest({ ...quote(), contentsType: 'GOODS', items: [blankCustomsLine] }).ok).toBe(true)
  })

  it('ignores spaces typed before or after an e-mail address, name or postal code', () => {
    const result = parseQuoteRequest(quote({ sender: address({ email: ' anna@example.dk ', fullName: ' Anna Jensen ' }), originPostalCode: '1850 ' }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.sender.email).toBe('anna@example.dk')
      expect(result.data.sender.fullName).toBe('Anna Jensen')
      expect(result.data.originPostalCode).toBe('1850')
    }
  })

  it('names the field when an e-mail address is not valid', () => {
    for (const email of ['anna@gmail', 'anna@gmail,com', 'anna gmail.com', 'ingen', 'søren@example.dk']) {
      const result = parseQuoteRequest(quote({ sender: address({ email }) }))
      expect(problemsOf(result), email).toEqual([{ path: 'sender.email', problem: 'invalid' }])
      expect(describeProblems(problemsOf(result))).toBe('Sender: the e-mail is not a valid e-mail address (example: name@mail.dk).')
    }
  })

  it('says which side and which field is missing or too short', () => {
    const result = parseQuoteRequest(quote({ recipient: address({ address1: 'A1', phone: '+45 1', city: '' }) }))
    expect(problemsOf(result)).toEqual([
      { path: 'recipient.address1', problem: 'too_short' },
      { path: 'recipient.city', problem: 'missing' },
      { path: 'recipient.phone', problem: 'too_short' },
    ])
    expect(describeProblems(problemsOf(result))).toBe('Recipient: the address is too short. Recipient: the city is missing. Recipient: the phone number is too short.')
  })

  it('reports a route field as the address field the customer can see, once', () => {
    const result = parseQuoteRequest(quote({ destinationPostalCode: '', recipient: address({ postalCode: '' }) }))
    expect(problemsOf(result)).toEqual([{ path: 'recipient.postalCode', problem: 'missing' }])
  })

  it('explains problems that are not in the address forms', () => {
    const text = (over: Record<string, unknown>) => describeProblems(problemsOf(parseQuoteRequest(JSON.parse(JSON.stringify(quote(over))))))
    expect(text({ parcels: [{ id: 'parcel-1', weight: 1, length: 0, width: 20, height: 8 }] })).toBe('Parcel 1: the weight or size is missing. Go back to the parcel step.')
    // An emptied price in a location's price list becomes null on its way to the server.
    expect(text({ locationRates: [{ maxWeight: 1, service_point: 89, home: NaN }] })).toBe("This location's price list has an empty or wrong price. Correct it in Admin → Settings → Location.")
    expect(text({ carrierName: undefined })).toBe('No carrier is chosen. Go back to the first step.')
  })

  it('says so when the request cannot be read at all', () => {
    expect(describeProblems(problemsOf(parseQuoteRequest(undefined)))).toBe('The request could not be read. Tap Refresh in the menu and start again.')
  })

  it('shows at most three reasons and counts the rest', () => {
    const result = parseQuoteRequest(quote({ sender: address({ fullName: '', address1: '', city: '', email: '', phone: '' }) }))
    expect(describeProblems(problemsOf(result))).toBe('Sender: the full name is missing. Sender: the address is missing. Sender: the city is missing. And 2 more.')
  })

  it('still reads the registered-letter choice that older app versions can send', () => {
    const result = parseQuoteRequest(quote({ registeredLetter: true }))
    expect(result.ok && result.data.registeredLetter).toBe(true)
  })
})

describe('booking request', () => {
  it('keeps the customs lines as sent, to be checked only when the destination needs them', () => {
    const result = parseShipmentRequest(booking({ items: [blankCustomsLine] }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.items).toHaveLength(1)
  })

  it('names what is missing for the booking itself', () => {
    const result = parseShipmentRequest(booking({ selectedQuoteId: '' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(describeProblems(result.problems)).toBe('No price is chosen. Go back one step and continue again.')
  })
})

describe('customs lines', () => {
  const line = { id: 'item-1', description: 'T-shirts', quantity: 1, unitValue: 250, currency: 'DKK', weight: 1, originCountry: 'DK', hsCode: '610910' }

  it('accepts a complete line', () => {
    expect(parseCustomsItems([line]).ok).toBe(true)
  })

  it('says which line and which field is wrong', () => {
    const result = parseCustomsItems([line, { ...line, id: 'item-2', description: '', hsCode: '12' }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.problems).toEqual([
        { path: 'items.1.description', problem: 'missing' },
        { path: 'items.1.hsCode', problem: 'invalid' },
      ])
      expect(describeProblems(result.problems)).toBe('Customs line 2: the description is missing. Customs line 2: the commodity code (6, 8, 10 or 12 digits) is not valid.')
    }
  })

  it('asks for customs details when there are none', () => {
    const result = parseCustomsItems([])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(describeProblems(result.problems)).toBe('This country needs customs details. Fill in the customs step.')
  })
})

describe('the tablet app checks an address the same way as the server', () => {
  it('uses the same e-mail pattern and the same shortest lengths', () => {
    expect(APP_EMAIL_PATTERN.source).toBe(EMAIL_PATTERN.source)
    expect(APP_MIN_LENGTH).toEqual(MIN_LENGTH)
  })

  // Each of these once passed the app and was then refused by the server, or the other way round.
  const samples: [string, Record<string, unknown>][] = [
    ['an ordinary address', {}],
    ['e-mail with a space after it', { email: 'anna@example.dk ' }],
    ['e-mail with capital letters', { email: 'Anna.Jensen@Example.DK' }],
    ['e-mail without an ending', { email: 'anna@gmail' }],
    ['e-mail with a comma', { email: 'anna@gmail,com' }],
    ['a word instead of an e-mail', { email: 'ingen' }],
    ['e-mail with a Danish letter', { email: 'søren@example.dk' }],
    ['empty e-mail', { email: '' }],
    ['address of two characters', { address1: 'A1' }],
    ['address of three characters', { address1: 'A 1' }],
    ['name of one letter', { fullName: 'A' }],
    ['name with spaces only', { fullName: '   ' }],
    ['postal code of one digit', { postalCode: '1' }],
    ['city of one letter', { city: 'Å' }],
    ['phone with the country code only', { phone: '+45' }],
    ['phone with one digit', { phone: '+45 1' }],
    ['phone with two digits', { phone: '+45 12' }],
    ['foreign phone number', { phone: '+44 7700900123' }],
  ]

  it.each(samples)('%s', (_name, over) => {
    const sender = address(over)
    // The server has the postal code a second time, as part of the route.
    const server = parseQuoteRequest(quote({ sender, originPostalCode: sender.postalCode }))
    const app = addressProblems(sender as Parameters<typeof addressProblems>[0])
    expect(app.length === 0).toBe(server.ok)
    // Both point at the same field. (The wording may differ: a country code alone is "missing" in
    // the app and "too short" on the server.)
    expect(app.map((p) => `sender.${p.field}`).sort()).toEqual(problemsOf(server).map((p) => p.path).sort())
  })
})
