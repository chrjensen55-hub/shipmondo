import nodemailer from 'nodemailer'
import type { CenterLink } from './center'

// E-mails from the Message Center go out through an ordinary mailbox (SMTP), set with the
// SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS variables in Vercel. No mailbox, no e-mail: the
// message is still delivered inside the app.

export type CenterEmailContent = {
  locationName: string
  subject: string
  text: string
  link?: CenterLink
  // Adds the "how to install the new version" steps.
  update: boolean
}

const SITE_URL = 'https://app.pakogsend.dk'
const DOWNLOAD_PAGE_URL = `${SITE_URL}/admin/settings/app`

const OPEN_STEPS = [
  'On the tablet, tap the menu button (the three lines, top left) and choose Settings (Indstillinger).',
  'Enter the 4-digit settings code.',
  'Open the Messages tab. This message is there, with the same button.',
]

const UPDATE_STEPS = [
  'If the tablet is locked in kiosk mode: open the menu, choose Disable Kiosk Mode (Deaktivér kioskfunktion) and enter the exit code.',
  'Open the message in the Messages tab and tap the download button. You can also open this e-mail on the tablet and tap the button here.',
  'When the download is finished, open the file and tap Install (or Update).',
  'Open Pak & Send again. Prices, settings and the printer stay as they were.',
  'Turn kiosk mode on again from the menu: Activate Kiosk Mode (Aktivér kioskfunktion).',
]

export function smtpSettings() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  const port = Number(process.env.SMTP_PORT) || 587
  return { host, port, user, pass, from: process.env.MAIL_FROM || `Pak & Send <${user}>`, replyTo: process.env.MAIL_REPLY_TO || user }
}

export function isEmailConfigured(): boolean {
  return smtpSettings() !== null
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;font-size:16px;line-height:24px;color:#0F1E33;">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function steps(title: string, items: string[]): string {
  const rows = items
    .map(
      (item, i) => `
        <tr>
          <td valign="top" width="34" style="padding:0 0 12px;">
            <div style="width:24px;height:24px;border-radius:12px;background:#E8F0F8;color:#0B4F82;font-size:13px;line-height:24px;font-weight:700;text-align:center;">${i + 1}</div>
          </td>
          <td valign="top" style="padding:1px 0 12px;font-size:15px;line-height:22px;color:#334155;">${escapeHtml(item)}</td>
        </tr>`,
    )
    .join('')
  return `
    <tr>
      <td style="padding:22px 32px 4px;border-top:1px solid #E2E8F0;">
        <p style="margin:0 0 14px;font-size:13px;line-height:18px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">${escapeHtml(title)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
      </td>
    </tr>`
}

// Builds the e-mail in two forms: a designed HTML version and a plain-text one for mail programs
// that show text only. Works without images, so nothing is blocked or missing in any mail program.
export function renderCenterEmail(content: CenterEmailContent): { subject: string; html: string; text: string } {
  const { locationName, subject, text, link, update } = content
  const preview = text.trim().replace(/\s+/g, ' ').slice(0, 110)
  const button = link
    ? `
      <tr>
        <td style="padding:6px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="#0B4F82" style="border-radius:10px;">
                <a href="${escapeHtml(link.url)}" target="_blank" style="display:inline-block;padding:15px 30px;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(link.label)}</a>
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 0;font-size:13px;line-height:19px;color:#6B7280;">If the button does not work, copy this address into the browser:<br><a href="${escapeHtml(link.url)}" style="color:#0B4F82;word-break:break-all;">${escapeHtml(link.url)}</a></p>
        </td>
      </tr>`
    : ''

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FB;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F7FB;">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
        <tr>
          <td bgcolor="#0B4F82" style="padding:22px 32px;">
            <p style="margin:0;font-size:20px;line-height:26px;font-weight:700;color:#ffffff;">Pak &amp; Send</p>
            <p style="margin:2px 0 0;font-size:13px;line-height:18px;color:#C9DDEE;">Message from head office</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 6px;">
            <h1 style="margin:0 0 16px;font-size:23px;line-height:30px;font-weight:700;color:#0F1E33;">${escapeHtml(subject)}</h1>
            <p style="margin:0 0 14px;font-size:16px;line-height:24px;color:#0F1E33;">Hello ${escapeHtml(locationName)},</p>
            ${paragraphs(text)}
          </td>
        </tr>
        ${button}
        <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
        ${update ? steps('How to install the new version', UPDATE_STEPS) : ''}
        ${steps('Where to find this message on the tablet', OPEN_STEPS)}
        <tr>
          <td style="padding:18px 32px 24px;border-top:1px solid #E2E8F0;">
            <p style="margin:0 0 8px;font-size:14px;line-height:21px;color:#334155;">You can also sign in on the website with the shop's staff login: <a href="${SITE_URL}" style="color:#0B4F82;">app.pakogsend.dk</a>. All app versions are on <a href="${DOWNLOAD_PAGE_URL}" style="color:#0B4F82;">Settings → Android app</a>.</p>
            <p style="margin:0;font-size:14px;line-height:21px;color:#334155;">To answer, write in the Messages tab on the tablet.</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;line-height:18px;color:#6B7280;">Sent from the Pak &amp; Send Message Center</p>
    </td>
  </tr>
</table>
</body>
</html>`

  const numbered = (items: string[]) => items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  const plain = [
    `Hello ${locationName},`,
    text.trim(),
    link ? `${link.label}: ${link.url}` : '',
    update ? `HOW TO INSTALL THE NEW VERSION\n${numbered(UPDATE_STEPS)}` : '',
    `WHERE TO FIND THIS MESSAGE ON THE TABLET\n${numbered(OPEN_STEPS)}`,
    `You can also sign in on the website with the shop's staff login: ${SITE_URL}\nAll app versions: ${DOWNLOAD_PAGE_URL}`,
    'To answer, write in the Messages tab on the tablet.',
  ]
    .filter(Boolean)
    .join('\n\n')

  return { subject, html, text: plain }
}

export async function sendCenterEmail(to: string, content: CenterEmailContent): Promise<void> {
  const smtp = smtpSettings()
  if (!smtp) throw new Error('E-mail is not set up.')
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  const mail = renderCenterEmail(content)
  await transport.sendMail({ from: smtp.from, replyTo: smtp.replyTo, to, subject: mail.subject, html: mail.html, text: mail.text })
}
