// Small key-value storage for the Message Center (messages, online status, parcel counts).
// Production uses an Upstash Redis database over its REST API (created from Vercel → Storage, which
// adds the KV_REST_API_* variables to the project). Development and tests use an in-memory copy
// with the same commands, so nothing has to be installed to work on it.

export type KvCommand = (string | number)[]

export interface Kv {
  // Runs the commands in order and returns one result per command.
  run(commands: KvCommand[]): Promise<unknown[]>
}

function restConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

export function createRestKv(url: string, token: string, fetchImpl: typeof fetch = fetch): Kv {
  return {
    async run(commands) {
      if (!commands.length) return []
      const res = await fetchImpl(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) throw new Error(`Storage responded ${res.status}`)
      const body = (await res.json()) as { result?: unknown; error?: string }[]
      return body.map((entry) => {
        if (entry.error) throw new Error(entry.error)
        return entry.result ?? null
      })
    },
  }
}

type MemoryValue = Map<string, string> | string[]

// The same commands the Message Center uses, kept in memory. Results have the same shape as the
// REST API's (HGETALL is a flat [field, value, field, value] list).
export function createMemoryKv(data: Map<string, MemoryValue> = new Map()): Kv {
  const hash = (key: string) => {
    let value = data.get(key)
    if (!(value instanceof Map)) {
      value = new Map<string, string>()
      data.set(key, value)
    }
    return value
  }
  const list = (key: string) => {
    let value = data.get(key)
    if (!Array.isArray(value)) {
      value = []
      data.set(key, value)
    }
    return value
  }
  const range = (items: string[], start: number, stop: number) => {
    const from = start < 0 ? Math.max(items.length + start, 0) : start
    const to = stop < 0 ? items.length + stop : Math.min(stop, items.length - 1)
    return items.slice(from, to + 1)
  }
  return {
    async run(commands) {
      return commands.map(([name, key, ...args]) => {
        const k = String(key)
        switch (String(name).toUpperCase()) {
          case 'HSET': {
            const h = hash(k)
            for (let i = 0; i < args.length; i += 2) h.set(String(args[i]), String(args[i + 1]))
            return args.length / 2
          }
          case 'HGET':
            return hash(k).get(String(args[0])) ?? null
          case 'HGETALL':
            return [...hash(k).entries()].flat()
          case 'HDEL': {
            const h = hash(k)
            return args.filter((field) => h.delete(String(field))).length
          }
          case 'HINCRBY': {
            const h = hash(k)
            const next = Number(h.get(String(args[0])) ?? 0) + Number(args[1])
            h.set(String(args[0]), String(next))
            return next
          }
          case 'RPUSH': {
            const l = list(k)
            l.push(...args.map(String))
            return l.length
          }
          case 'LRANGE':
            return range(list(k), Number(args[0]), Number(args[1]))
          case 'LTRIM': {
            const l = list(k)
            data.set(k, range(l, Number(args[0]), Number(args[1])))
            return 'OK'
          }
          case 'EXPIRE':
            return 1
          case 'DEL':
            return data.delete(k) ? 1 : 0
          default:
            throw new Error(`Unsupported storage command: ${String(name)}`)
        }
      })
    },
  }
}

const globalStore = globalThis as typeof globalThis & { __pakCenterMemory?: Map<string, MemoryValue> }

// The storage to use, or null when production has no database connected yet. Callers treat null
// as "the Message Center is not set up" and answer with empty data instead of failing.
export function getKv(): Kv | null {
  const rest = restConfig()
  if (rest) return createRestKv(rest.url, rest.token)
  if (process.env.NODE_ENV !== 'production') {
    globalStore.__pakCenterMemory ??= new Map()
    return createMemoryKv(globalStore.__pakCenterMemory)
  }
  return null
}

export function isCenterStorageConfigured(): boolean {
  return restConfig() !== null || process.env.NODE_ENV !== 'production'
}
