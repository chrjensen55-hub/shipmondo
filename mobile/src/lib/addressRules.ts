import { hasPhoneDigits } from './dialCodes'

// The same checks the server makes on an address (src/lib/validation.ts in the web app), made in
// the app first. Continue only opens when the server will accept what was typed, and the line
// above the button says which field to fix. Keep the pattern and the lengths equal to the
// server's: the server's test file (src/lib/validation.test.ts) fails when they drift apart.

// Standard e-mail shape: letters, digits and . _ ' + - before the @, and a domain with a dot.
export const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/
// Shortest accepted text per field, counted after spaces at the ends are removed.
export const MIN_LENGTH = { fullName: 2, address1: 3, postalCode: 2, city: 2, phone: 6 } as const

export type AddressField = 'fullName' | 'company' | 'address1' | 'postalCode' | 'city' | 'email' | 'phone'
export type AddressProblem = { field: AddressField; problem: 'missing' | 'too_short' | 'invalid' }
type AddressValues = { fullName: string; company?: string; address1: string; postalCode: string; city: string; email: string; phone: string }

// Problems in the order the fields are shown. An empty list means the address can be sent.
export function addressProblems(address: AddressValues, options: { companyRequired?: boolean } = {}): AddressProblem[] {
  const problems: AddressProblem[] = []
  const length = (field: 'fullName' | 'address1' | 'postalCode' | 'city', min: number) => {
    const typed = address[field].trim().length
    if (typed === 0) problems.push({ field, problem: 'missing' })
    else if (typed < min) problems.push({ field, problem: 'too_short' })
  }

  length('fullName', MIN_LENGTH.fullName)
  // Business parcels go to a company, so its name is needed (the server has no rule of its own here).
  if (options.companyRequired && (address.company ?? '').trim().length < 2) problems.push({ field: 'company', problem: 'missing' })
  length('address1', MIN_LENGTH.address1)
  length('postalCode', MIN_LENGTH.postalCode)
  length('city', MIN_LENGTH.city)

  const email = address.email.trim()
  if (email.length === 0) problems.push({ field: 'email', problem: 'missing' })
  else if (!EMAIL_PATTERN.test(email)) problems.push({ field: 'email', problem: 'invalid' })

  // A country code alone ("+45") is not a number yet.
  if (!hasPhoneDigits(address.phone)) problems.push({ field: 'phone', problem: 'missing' })
  else if (address.phone.trim().length < MIN_LENGTH.phone) problems.push({ field: 'phone', problem: 'too_short' })

  return problems
}
