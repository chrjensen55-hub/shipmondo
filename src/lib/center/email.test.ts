import { afterEach, describe, expect, it, vi } from 'vitest'
import { isEmailConfigured, renderCenterEmail, smtpSettings } from './email'
import { isOlderVersion } from '../appVersions'

describe('Message Center e-mail', () => {
  const update = renderCenterEmail({
    locationName: 'Pak og Send Lyngby',
    subject: 'New version of the Pak & Send app',
    text: 'Version 1.10.0 is ready.\nPlease install it today.\n\nThanks <team>',
    link: { url: 'https://example.com/pak-and-send-native.apk?a=1&b=2', label: 'Download version 1.10.0' },
    update: true,
  })

  it('greets the location and shows the message, with special characters made safe', () => {
    expect(update.subject).toBe('New version of the Pak & Send app')
    expect(update.html).toContain('Hello Pak og Send Lyngby,')
    expect(update.html).toContain('Version 1.10.0 is ready.<br>Please install it today.')
    expect(update.html).toContain('Thanks &lt;team&gt;')
    expect(update.html).not.toContain('<team>')
  })

  it('shows the link as a button, with the address written out below it', () => {
    expect(update.html).toContain('>Download version 1.10.0</a>')
    expect(update.html).toContain('href="https://example.com/pak-and-send-native.apk?a=1&amp;b=2"')
    expect(update.text).toContain('Download version 1.10.0: https://example.com/pak-and-send-native.apk?a=1&b=2')
  })

  it('explains how to install and where to sign in, without any password or code', () => {
    expect(update.html).toContain('How to install the new version')
    expect(update.html).toContain('Where to find this message on the tablet')
    expect(update.text).toContain('HOW TO INSTALL THE NEW VERSION')
    expect(update.text).toContain('https://app.pakogsend.dk')
    expect(update.html + update.text).not.toMatch(/0088|password is|0000/i)
  })

  it('leaves the install steps and the button out of an ordinary message', () => {
    const plain = renderCenterEmail({ locationName: 'Courier Copenhagen', subject: 'Message from Pak & Send', text: 'We close at 16 on Friday.', update: false })
    expect(plain.html).not.toContain('How to install the new version')
    expect(plain.html).toContain('Where to find this message on the tablet')
    expect(plain.html).not.toContain('If the button does not work')
    expect(plain.text).not.toContain('HOW TO INSTALL')
  })
})

describe('mailbox settings', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is off until host, user and password are all set', () => {
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
    expect(isEmailConfigured()).toBe(false)
    vi.stubEnv('SMTP_HOST', 'smtp.example.dk')
    vi.stubEnv('SMTP_USER', 'info@example.dk')
    expect(isEmailConfigured()).toBe(false)
    vi.stubEnv('SMTP_PASS', 'x')
    expect(isEmailConfigured()).toBe(true)
  })

  it('uses port 587 and the mailbox as sender unless told otherwise', () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.dk')
    vi.stubEnv('SMTP_USER', 'info@example.dk')
    vi.stubEnv('SMTP_PASS', 'x')
    vi.stubEnv('SMTP_PORT', '')
    vi.stubEnv('MAIL_FROM', '')
    expect(smtpSettings()).toMatchObject({ port: 587, from: 'Pak & Send <info@example.dk>', replyTo: 'info@example.dk' })
  })
})

describe('app versions', () => {
  it('compares versions number by number, not as text', () => {
    expect(isOlderVersion('1.9.0', '1.10.0')).toBe(true)
    expect(isOlderVersion('1.10.0', '1.9.0')).toBe(false)
    expect(isOlderVersion('1.10.0', '1.10.0')).toBe(false)
    expect(isOlderVersion('1.8', '1.8.1')).toBe(true)
  })

  it('never calls an unknown version outdated', () => {
    expect(isOlderVersion('', '1.10.0')).toBe(false)
    expect(isOlderVersion('dev', '1.10.0')).toBe(false)
  })
})
