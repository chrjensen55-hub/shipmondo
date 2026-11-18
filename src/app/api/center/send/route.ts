import { getKv } from '@/lib/center/kv'
import { KNOWN_LOCATIONS, UNKNOWN_LOCATION_ID, WEB_LOCATION_ID, getLocationEmails, sendOfficeMessage } from '@/lib/center/center'
import { isEmailConfigured, sendCenterEmail } from '@/lib/center/email'
import { invalidRequest, notSetUp, sendSchema, storageFailed, type EmailResult } from '@/lib/center/http'

// E-mails go out through a mailbox, which can take a few seconds per location.
export const maxDuration = 60

// Head office sends one message to one or more locations. Every location gets it in the app; with
// "email" it is also sent to the location's e-mail address when one is saved.
export async function POST(request: Request) {
  const parsed = sendSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()
  const kv = getKv()
  if (!kv) return notSetUp()
  const { text, link, email, subject, update } = parsed.data
  const ids = [...new Set(parsed.data.locationIds)].filter((id) => id !== WEB_LOCATION_ID && id !== UNKNOWN_LOCATION_ID)
  if (!ids.length) return invalidRequest()

  try {
    const emailResults: Record<string, EmailResult> = {}
    if (email) {
      const configured = isEmailConfigured()
      const addresses = configured ? await getLocationEmails(kv) : {}
      await Promise.all(
        ids.map(async (id) => {
          if (!configured) {
            emailResults[id] = 'not-set-up'
            return
          }
          const to = addresses[id]
          if (!to) {
            emailResults[id] = 'no-address'
            return
          }
          try {
            await sendCenterEmail(to, {
              locationName: KNOWN_LOCATIONS.find((l) => l.id === id)?.name ?? id,
              subject: subject || (update ? 'New version of the Pak & Send app' : 'Message from Pak & Send'),
              text,
              link,
              update,
            })
            emailResults[id] = 'sent'
          } catch (err) {
            console.error('Message Center e-mail failed', id, err)
            emailResults[id] = 'failed'
          }
        }),
      )
    }
    await sendOfficeMessage(kv, ids, { text, link, emailedTo: ids.filter((id) => emailResults[id] === 'sent') })
    return Response.json({ data: { sent: ids.length, email: emailResults } }, { status: 201 })
  } catch (err) {
    return storageFailed(err)
  }
}
