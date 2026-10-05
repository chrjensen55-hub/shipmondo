// atob isn't guaranteed to exist in Hermes, so label payloads (ZPL, base64) are decoded here.
export function base64ToUtf8(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = base64.replace(/=+$/, '')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    const val = chars.indexOf(ch)
    if (val === -1) continue
    buffer = (buffer << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i++]
    if (b0 < 0x80) out += String.fromCharCode(b0)
    else if (b0 >> 5 === 0x6) out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f))
    else if (b0 >> 4 === 0xe) out += String.fromCharCode(((b0 & 0xf) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f))
    else i += 3
  }
  return out
}
