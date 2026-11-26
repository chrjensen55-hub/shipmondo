import { describeProblems, type FieldProblem } from './validation'

// The answers the price and booking routes give when they cannot go on. Every refusal says what
// is wrong in plain words, and is written to the server log with the reason (field names only,
// never what the customer typed), so a problem at a shop can be traced afterwards.

const who = (request: Request) => ({
  location: (request.headers.get('x-location-id') ?? '').slice(0, 40),
  appVersion: (request.headers.get('x-app-version') ?? '').slice(0, 20),
})

// Details the server cannot accept. `fields` lets the app say it in the customer's language.
export function refuseDetails(route: string, request: Request, problems: FieldProblem[]): Response {
  console.warn(`Refused ${route}: details not accepted`, JSON.stringify({ fields: problems, ...who(request) }))
  return Response.json({ error: { code: 'INVALID_REQUEST', message: describeProblems(problems), fields: problems } }, { status: 400 })
}

// PostNord stopped selling the registered letter. App versions up to 1.11.0 still show the choice.
export function refuseRegisteredLetter(route: string, request: Request): Response {
  console.warn(`Refused ${route}: registered letter`, JSON.stringify(who(request)))
  return Response.json({ error: { code: 'REGISTERED_LETTER_DISCONTINUED', message: 'PostNord no longer offers the registered letter. Go back to the parcel step and choose Parcel.' } }, { status: 400 })
}

// Something broke on the server itself. This is never the customer's typing.
export function serverFault(route: string, request: Request, err: unknown): Response {
  console.error(`Failed ${route}: server fault`, JSON.stringify(who(request)), err)
  return Response.json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong on the server, not with what you typed. Please try again in a moment.' } }, { status: 500 })
}
