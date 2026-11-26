import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as quotes } from '@/app/api/quotes/route'
import { POST as shipments } from '@/app/api/shipments/route'

// The price and booking routes as the tablet app calls them, with sample prices instead of
// Shipmondo (SHIPMONDO_MOCK_MODE), so nothing is booked.

const address = (over: Record<string, unknown> = {}) => ({ fullName: 'Anna Jensen', company: '', address1: 'Gl. Kongevej 163', address2: '', postalCode: '1850', city: 'Frederiksberg C', country: 'DK', email: 'anna@example.dk', phone: '+45 33257725', ...over })
const draft = (over: Record<string, unknown> = {}) => ({
  originCountry: 'DK',
  originPostalCode: '1850',
  destinationCountry: 'DK',
  destinationPostalCode: '2730',
  carrierName: 'GLS',
  deliveryLocation: 'home',
  sender: address(),
  recipient: address({ fullName: 'Mette Hansen', address1: 'Herlev Hovedgade 100', postalCode: '2730', city: 'Herlev' }),
  parcels: [{ id: 'parcel-1', weight: 1, length: 30, width: 20, height: 8 }],
  contentsType: 'GOODS',
  items: [] as unknown[],
  ...over,
})
// The empty line the customs step adds when it opens.
const blankCustomsLine = { id: 'item-1', description: '', quantity: 1, unitValue: 0, currency: 'DKK', weight: 1, originCountry: 'DK', hsCode: '' }

const post = (path: string, body: unknown) => new Request(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-location-id': 'lyngby', 'x-app-version': '1.11.0' }, body: typeof body === 'string' ? body : JSON.stringify(body) })

let warnings: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.stubEnv('SHIPMONDO_MOCK_MODE', 'true')
  vi.stubEnv('SHIPMONDO_API_BASE_URL', 'https://sandbox.example/api')
  vi.stubEnv('SHIPMONDO_API_USERNAME', 'user')
  vi.stubEnv('SHIPMONDO_API_KEY', 'key')
  warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/quotes', () => {
  it('gives a price for an ordinary parcel', async () => {
    const res = await quotes(post('/api/quotes', draft()))
    expect(res.status).toBe(200)
    expect((await res.json()).data[0].carrier).toBe('GLS')
  })

  it('gives a price although an empty customs line was left behind (the step-5 bug)', async () => {
    const res = await quotes(post('/api/quotes', draft({ items: [blankCustomsLine] })))
    expect(res.status).toBe(200)
  })

  it('gives a price when a space was typed after the e-mail address', async () => {
    const res = await quotes(post('/api/quotes', draft({ sender: address({ email: 'anna@example.dk ' }) })))
    expect(res.status).toBe(200)
  })

  it('names the wrong field instead of "please check the shipment details"', async () => {
    const res = await quotes(post('/api/quotes', draft({ sender: address({ email: 'ingen' }) })))
    expect(res.status).toBe(400)
    const { error } = await res.json()
    expect(error.code).toBe('INVALID_REQUEST')
    expect(error.message).toBe('Sender: the e-mail is not a valid e-mail address (example: name@mail.dk).')
    expect(error.fields).toEqual([{ path: 'sender.email', problem: 'invalid' }])
  })

  it('writes the reason to the server log, without anything the customer typed', async () => {
    await quotes(post('/api/quotes', draft({ sender: address({ email: 'ingen' }) })))
    const logged = warnings.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n')
    expect(logged).toContain('sender.email')
    expect(logged).toContain('lyngby')
    expect(logged).toContain('1.11.0')
    expect(logged).not.toContain('ingen')
    expect(logged).not.toContain('Anna')
  })

  it('refuses the registered letter, which PostNord no longer sells', async () => {
    const res = await quotes(post('/api/quotes', draft({ carrierName: 'PostNord', destinationCountry: 'SE', registeredLetter: true })))
    expect(res.status).toBe(400)
    const { error } = await res.json()
    expect(error.code).toBe('REGISTERED_LETTER_DISCONTINUED')
    expect(error.message).toContain('no longer offers the registered letter')
  })

  it('answers plainly when the request cannot be read', async () => {
    const res = await quotes(post('/api/quotes', '{not json'))
    expect(res.status).toBe(400)
    expect((await res.json()).error.message).toBe('The request could not be read. Tap Refresh in the menu and start again.')
  })
})

describe('POST /api/shipments', () => {
  const booking = (over: Record<string, unknown> = {}) => ({ ...draft(), selectedQuoteId: 'quote-gls', confirmation: true, idempotencyKey: `test-${Math.random().toString(36).slice(2)}-key`, ...over })

  it('books an ordinary parcel', async () => {
    const res = await shipments(post('/api/shipments', booking()))
    expect(res.status).toBe(201)
    expect((await res.json()).data.reference).toMatch(/^PS-\d+$/)
  })

  it('books a parcel inside Denmark although an empty customs line was left behind', async () => {
    const res = await shipments(post('/api/shipments', booking({ items: [blankCustomsLine] })))
    expect(res.status).toBe(201)
  })

  it('names the wrong field', async () => {
    const res = await shipments(post('/api/shipments', booking({ recipient: address({ phone: '+45 1' }) })))
    expect(res.status).toBe(400)
    expect((await res.json()).error.message).toBe('Recipient: the phone number is too short.')
  })

  it('refuses the registered letter', async () => {
    const res = await shipments(post('/api/shipments', booking({ registeredLetter: true })))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('REGISTERED_LETTER_DISCONTINUED')
  })
})
