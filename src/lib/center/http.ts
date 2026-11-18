import { z } from 'zod'
import { LOCATION_ID_RE } from './center'

// Shared pieces for the /api/center routes: the request shapes and the two standard error answers.

export type EmailResult = 'sent' | 'no-address' | 'not-set-up' | 'failed'

export const locationId = z.string().regex(LOCATION_ID_RE)
const messageText = z.string().trim().min(1).max(2000)
const webUrl = z.string().trim().url().max(500).refine((value) => /^https?:\/\//i.test(value), 'Only http and https links')

export const heartbeatSchema = z.object({
  locationId,
  locationName: z.string().trim().min(1).max(80),
  deviceId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  appVersion: z.string().trim().max(20),
  platform: z.string().trim().max(20),
})

export const replySchema = z.object({ locationId, text: messageText })

export const readSchema = z.object({ locationId, reader: z.enum(['location', 'office']) })

export const sendSchema = z.object({
  locationIds: z.array(locationId).min(1).max(30),
  text: messageText,
  link: z.object({ url: webUrl, label: z.string().trim().min(1).max(40) }).optional(),
  email: z.boolean().default(false),
  subject: z.string().trim().max(120).optional(),
  // Marks an app-update message: the e-mail then includes the install steps.
  update: z.boolean().default(false),
})

export const locationEmailSchema = z.object({ locationId, email: z.union([z.literal(''), z.string().trim().email().max(120)]) })

export const invalidRequest = () => Response.json({ error: { code: 'INVALID_REQUEST', message: 'Please check what was entered and try again.' } }, { status: 400 })

export const notSetUp = () => Response.json({ error: { code: 'CENTER_NOT_SET_UP', message: 'The Message Center has no database yet. Connect one in Vercel (Storage → Upstash for Redis) and try again.' } }, { status: 503 })

export const storageFailed = (err: unknown) => {
  console.error('Message Center storage failed', err)
  return Response.json({ error: { code: 'CENTER_STORAGE_FAILED', message: 'The Message Center could not be reached. Please try again in a moment.' } }, { status: 502 })
}
