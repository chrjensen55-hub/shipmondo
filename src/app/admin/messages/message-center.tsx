'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Database, Download, ExternalLink, Link2, Mail, MessageSquare, Send, Smartphone, Wifi, WifiOff } from 'lucide-react'
import type { CenterLocation, CenterMessage, CenterOverview, Counts } from '@/lib/center/center'
import type { EmailResult } from '@/lib/center/http'
import { isOlderVersion } from '@/lib/appVersions'
import { formatDateTime } from '@/lib/format'

type CenterData = {
  configured: { storage: boolean; email: boolean }
  overview: CenterOverview | null
  latestRelease: { version: string; downloadUrl: string } | null
}

const REFRESH_MS = 60_000
const THREAD_REFRESH_MS = 20_000

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json' } })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body || body.error) throw new Error(body?.error?.message ?? 'Something went wrong. Please try again.')
  return body.data as T
}

// "3 min ago", "2 h ago", "5 days ago": how long since a tablet last reported in.
function ago(ms: number | null, now: number): string {
  if (ms === null) return 'never'
  const minutes = Math.max(0, Math.round((now - ms) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

function statusText(location: CenterLocation, now: number): string {
  if (location.online) return 'Online'
  if (location.lastSeen === null) return 'Not connected yet'
  return `Offline · last seen ${ago(location.lastSeen, now)}`
}

const dayLabel = (date: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

export function MessageCenter() {
  const [data, setData] = useState<CenterData | null>(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'messages' | 'numbers'>('messages')
  const [now, setNow] = useState(0)

  const load = useCallback(async () => {
    try {
      setData(await call<CenterData>('/api/center/overview'))
      setNow(Date.now())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the Message Center.')
    }
  }, [])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  if (!data) {
    return <div className="admin-content">{error ? <div className="form-error">{error}</div> : <p className="mc-muted">Loading the Message Center…</p>}</div>
  }

  if (!data.configured.storage || !data.overview) {
    return (
      <div className="admin-content">
        <SetupCard />
      </div>
    )
  }

  const { overview, latestRelease, configured } = data
  const shops = overview.locations.filter((l) => l.canMessage)
  const selected = overview.locations.find((l) => l.id === selectedId) ?? shops[0] ?? overview.locations[0]
  const topCarrier = overview.totals.carriers[0]

  return (
    <div className="admin-content">
      {error && <div className="form-error mc-gap">{error}</div>}

      <div className="mc-tiles">
        <Tile label="Locations online" value={`${overview.totals.online} of ${shops.length}`} note={overview.totals.connected ? `${overview.totals.connected} connected so far` : 'No tablet has connected yet'} />
        <Tile label="Parcels today" value={String(overview.totals.today.parcels)} note={`${overview.totals.today.shipments} shipments`} />
        <Tile label="Last 7 days" value={String(overview.totals.last7.parcels)} note={`${overview.totals.last7.shipments} shipments`} />
        <Tile label="Last 30 days" value={String(overview.totals.last30.parcels)} note={`${overview.totals.last30.shipments} shipments`} />
        <Tile label="Most used carrier" value={topCarrier ? topCarrier.name : '–'} note={topCarrier ? `${topCarrier.count} shipments in total` : 'No shipments counted yet'} />
      </div>

      <div className="mc-grid">
        <section className="table-card mc-list" aria-label="Locations">
          <header>
            <div>
              <h2>Locations</h2>
              <p>Choose one to write to it or see its numbers</p>
            </div>
          </header>
          {overview.locations.map((location) => (
            <button key={location.id} type="button" className={`mc-loc${location.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(location.id)}>
              <span className={`mc-dot ${location.online ? 'online' : location.lastSeen === null ? 'never' : 'offline'}`} aria-hidden="true" />
              <span className="mc-loc-text">
                <b>{location.name}</b>
                <small>
                  {location.canMessage ? statusText(location, now) : 'Bookings without a tablet location'}
                  {location.appVersion ? ` · v${location.appVersion}` : ''}
                </small>
              </span>
              <span className="mc-loc-side">
                {location.unreadReplies > 0 && <span className="mc-badge" aria-label={`${location.unreadReplies} new answers`}>{location.unreadReplies}</span>}
                <small>{location.stats.today.parcels} today</small>
              </span>
            </button>
          ))}
        </section>

        {selected && (
          <section className="table-card mc-panel" aria-label={selected.name}>
            <LocationHeader key={`head-${selected.id}`} location={selected} now={now} latestVersion={latestRelease?.version ?? ''} onSaved={load} />
            <div className="mc-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'messages'} className={tab === 'messages' ? 'selected' : ''} onClick={() => setTab('messages')}>
                <MessageSquare size={16} /> Messages
                {selected.unreadReplies > 0 && <span className="mc-badge">{selected.unreadReplies}</span>}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'numbers'} className={tab === 'numbers' ? 'selected' : ''} onClick={() => setTab('numbers')}>
                Parcel numbers
              </button>
            </div>
            {tab === 'messages' ? (
              selected.canMessage ? (
                <Thread key={`thread-${selected.id}`} location={selected} shops={shops} latestRelease={latestRelease} emailReady={configured.email} onChanged={load} />
              ) : (
                <p className="mc-empty">These bookings did not come from a tablet with a location, so there is nobody to write to. Their numbers are under Parcel numbers.</p>
              )
            ) : (
              <Numbers location={selected} />
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <section className="metric">
      <header>
        <span>{label}</span>
      </header>
      <b>{value}</b>
      <small>{note}</small>
    </section>
  )
}

function SetupCard() {
  return (
    <section className="setup-card mc-setup">
      <Database />
      <h2>The Message Center needs a small database</h2>
      <p>Messages, online status and parcel numbers have to be stored somewhere. It takes about two minutes in Vercel and is free for this amount of use.</p>
      <ol>
        <li>Open the project <b>shipmondo</b> in Vercel and go to <b>Storage</b>.</li>
        <li>Choose <b>Create Database</b>, then <b>Upstash for Redis</b>.</li>
        <li>Pick the free plan and a region in Europe, then <b>Create</b>.</li>
        <li>Choose <b>Connect Project</b> and select <b>shipmondo</b>.</li>
        <li>Deploy the site again (Deployments → the newest one → Redeploy). This page then starts working.</li>
      </ol>
    </section>
  )
}

function LocationHeader({ location, now, latestVersion, onSaved }: { location: CenterLocation; now: number; latestVersion: string; onSaved: () => void }) {
  const [email, setEmail] = useState(location.email)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const outdated = location.appVersion !== '' && latestVersion !== '' && isOlderVersion(location.appVersion, latestVersion)

  async function save() {
    setState('saving')
    try {
      await call('/api/center/location', { method: 'POST', body: JSON.stringify({ locationId: location.id, email: email.trim() }) })
      setState('saved')
      onSaved()
    } catch {
      setState('error')
    }
  }

  return (
    <header className="mc-head">
      <div className="mc-head-main">
        <h2>{location.name}</h2>
        <div className="mc-chips">
          {location.canMessage && (
            <span className={`mc-pill ${location.online ? 'online' : 'offline'}`}>
              {location.online ? <Wifi size={14} /> : <WifiOff size={14} />} {statusText(location, now)}
            </span>
          )}
          {location.appVersion && (
            <span className={`mc-pill ${outdated ? 'warn' : 'neutral'}`}>
              <Smartphone size={14} /> App {location.appVersion}
              {outdated ? ` · ${latestVersion} is available` : ''}
            </span>
          )}
          {location.devices.length > 1 && <span className="mc-pill neutral">{location.devices.length} tablets</span>}
          {location.canMessage && location.unreadForLocation > 0 && <span className="mc-pill neutral">{location.unreadForLocation} not opened by the location yet</span>}
        </div>
      </div>
      {location.canMessage && (
        <form
          className="mc-email"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label htmlFor={`mc-email-${location.id}`}>E-mail address of this location</label>
          <div>
            <input
              id={`mc-email-${location.id}`}
              type="email"
              placeholder="shop@example.dk"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setState('idle')
              }}
            />
            <button className="button button-secondary" type="submit" disabled={state === 'saving' || email.trim() === location.email}>
              {state === 'saved' ? <Check size={16} /> : null} {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save'}
            </button>
          </div>
          {state === 'error' && <small className="pin-error">That does not look like an e-mail address.</small>}
        </form>
      )}
    </header>
  )
}

function Thread({ location, shops, latestRelease, emailReady, onChanged }: { location: CenterLocation; shops: CenterLocation[]; latestRelease: CenterData['latestRelease']; emailReady: boolean; onChanged: () => void }) {
  const [messages, setMessages] = useState<CenterMessage[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const hadUnread = location.unreadReplies > 0

  const load = useCallback(async () => {
    try {
      const data = await call<{ messages: CenterMessage[] }>(`/api/center/thread?locationId=${location.id}`)
      setMessages(data.messages)
      setLoadError('')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the messages.')
    }
  }, [location.id])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), THREAD_REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  // Opening the thread counts as having read the location's answers.
  useEffect(() => {
    if (!hadUnread) return
    call('/api/center/read', { method: 'POST', body: JSON.stringify({ locationId: location.id, reader: 'office' }) })
      .then(onChanged)
      .catch(() => {})
    // Only when new answers arrive for this location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadUnread, location.id])

  const count = messages?.length ?? 0
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [count])

  return (
    <>
      <div className="mc-thread" ref={listRef} aria-live="polite">
        {loadError && <div className="form-error">{loadError}</div>}
        {messages === null && !loadError && <p className="mc-muted">Loading messages…</p>}
        {messages?.length === 0 && <p className="mc-empty">No messages yet. Write the first one below.</p>}
        {messages?.map((m) => (
          <div key={m.id} className={`mc-msg ${m.from}`}>
            <small>
              {m.from === 'office' ? 'Head office' : location.name} · {formatDateTime(new Date(m.createdAt).toISOString())}
              {m.emailed ? ' · also sent by e-mail' : ''}
            </small>
            <p>{m.text}</p>
            {m.link && (
              <a className="mc-link-button" href={m.link.url} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> {m.link.label}
              </a>
            )}
          </div>
        ))}
      </div>
      <Composer location={location} shops={shops} latestRelease={latestRelease} emailReady={emailReady} onSent={() => {
          load()
          onChanged()
        }}
      />
    </>
  )
}

const EMAIL_RESULT_TEXT: Record<EmailResult, string> = {
  sent: 'e-mail sent',
  'no-address': 'no e-mail address saved',
  'not-set-up': 'e-mail is not set up',
  failed: 'the e-mail could not be sent',
}

function Composer({ location, shops, latestRelease, emailReady, onSent }: { location: CenterLocation; shops: CenterLocation[]; latestRelease: CenterData['latestRelease']; emailReady: boolean; onSent: () => void }) {
  const [text, setText] = useState('')
  const [withLink, setWithLink] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState(false)
  const [subject, setSubject] = useState('')
  const [toAll, setToAll] = useState(false)
  const [update, setUpdate] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  // Fills in the ready-made message about a new app version, with the download button.
  function fillUpdateMessage() {
    if (!latestRelease) return
    setText(`Version ${latestRelease.version} of the Pak & Send app is ready. Please install it on the tablet today. Tap the button below to download it.`)
    setWithLink(true)
    setUrl(latestRelease.downloadUrl)
    setLabel(`Download version ${latestRelease.version}`)
    setEmail(true)
    setSubject(`New version of the Pak & Send app (${latestRelease.version})`)
    setUpdate(true)
    setResult(null)
  }

  const linkComplete = !withLink || (/^https?:\/\/\S+$/i.test(url.trim()) && label.trim().length > 0)
  const canSend = text.trim().length > 0 && linkComplete && !sending
  const targets = toAll ? shops : [location]

  async function send() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    try {
      const data = await call<{ sent: number; email: Record<string, EmailResult> }>('/api/center/send', {
        method: 'POST',
        body: JSON.stringify({
          locationIds: targets.map((l) => l.id),
          text: text.trim(),
          ...(withLink ? { link: { url: url.trim(), label: label.trim() } } : {}),
          email,
          ...(email && subject.trim() ? { subject: subject.trim() } : {}),
          update: update && withLink,
        }),
      })
      const mail = Object.entries(data.email).map(([id, status]) => `${targets.find((l) => l.id === id)?.name ?? id}: ${EMAIL_RESULT_TEXT[status]}`)
      setResult({ ok: true, text: `Sent to ${data.sent === 1 ? targets[0].name : `${data.sent} locations`}.${mail.length ? ` E-mail: ${mail.join('; ')}.` : ''}` })
      setText('')
      setWithLink(false)
      setUrl('')
      setLabel('')
      setEmail(false)
      setSubject('')
      setUpdate(false)
      onSent()
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'The message could not be sent.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      className="mc-composer"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <label className="mc-label" htmlFor="mc-text">
        Message to {toAll ? `all ${shops.length} locations` : location.name}
      </label>
      <textarea id="mc-text" rows={3} maxLength={2000} placeholder="Write a message…" value={text} onChange={(e) => setText(e.target.value)} />

      {withLink && (
        <div className="mc-link-fields">
          <label className="field">
            <span>Link (opens when the button is tapped)</span>
            <input type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="field">
            <span>Text on the button</span>
            <input maxLength={40} placeholder="Download" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
        </div>
      )}

      {email && (
        <label className="field">
          <span>
            E-mail subject <small>Optional</small>
          </span>
          <input maxLength={120} placeholder={update ? 'New version of the Pak & Send app' : 'Message from Pak & Send'} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
      )}

      <div className="mc-options">
        <label className="mc-check">
          <input
            type="checkbox"
            checked={withLink}
            onChange={(e) => {
              setWithLink(e.target.checked)
              if (!e.target.checked) setUpdate(false)
            }}
          />
          <Link2 size={16} /> Add a button with a link
        </label>
        <label className="mc-check">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
          <Mail size={16} /> Also send as e-mail
        </label>
        <label className="mc-check">
          <input type="checkbox" checked={toAll} onChange={(e) => setToAll(e.target.checked)} />
          Send to all locations
        </label>
      </div>
      {email && !emailReady && <p className="mc-hint warn">E-mail sending is not set up yet (SMTP settings in Vercel). The message is still delivered in the app.</p>}
      {email && emailReady && targets.some((l) => !l.email) && <p className="mc-hint warn">No e-mail address saved for: {targets.filter((l) => !l.email).map((l) => l.name).join(', ')}. They get the message in the app only.</p>}

      <div className="mc-actions">
        <button type="button" className="button button-secondary" onClick={fillUpdateMessage} disabled={!latestRelease} title={latestRelease ? undefined : 'The version list could not be read right now'}>
          <Download size={16} /> {latestRelease ? `New version message (${latestRelease.version})` : 'New version message'}
        </button>
        <button type="submit" className="button button-primary" disabled={!canSend}>
          <Send size={16} /> {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {result && (
        <div className={result.ok ? 'form-success' : 'form-error'} role="status">
          {result.text}
        </div>
      )}
    </form>
  )
}

function Numbers({ location }: { location: CenterLocation }) {
  const { stats } = location
  const most = Math.max(1, ...stats.carriers.map((c) => c.count))
  const periods: [string, Counts][] = [
    ['Today', stats.today],
    ['Last 7 days', stats.last7],
    ['Last 30 days', stats.last30],
    ['All time', stats.total],
  ]
  return (
    <div className="mc-numbers">
      <div className="mc-periods">
        {periods.map(([label, counts]) => (
          <div key={label}>
            <small>{label}</small>
            <b>{counts.parcels}</b>
            <span>
              parcels in {counts.shipments} {counts.shipments === 1 ? 'shipment' : 'shipments'}
            </span>
          </div>
        ))}
      </div>

      <h3>Carriers used</h3>
      {stats.carriers.length === 0 ? (
        <p className="mc-muted">No shipments counted yet. Counting starts with app version 1.10.0.</p>
      ) : (
        <div className="mc-bars">
          {stats.carriers.map((c) => (
            <div key={c.name} className="mc-bar">
              <span>{c.name}</span>
              <i>
                <em style={{ width: `${(c.count / most) * 100}%` }} />
              </i>
              <b>{c.count}</b>
            </div>
          ))}
        </div>
      )}

      <h3>Day by day</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Shipments</th>
              <th>Parcels</th>
            </tr>
          </thead>
          <tbody>
            {stats.days.map((day) => (
              <tr key={day.date}>
                <td>{dayLabel(day.date)}</td>
                <td>{day.shipments}</td>
                <td>{day.parcels}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mc-muted mc-foot">Numbers only: no names, addresses or other customer details are stored here.</p>
    </div>
  )
}
