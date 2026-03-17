/**
 * Pure browser TOTP implementation (RFC 6238) using Web Crypto API.
 * Compatible with Google Authenticator, Authy, and any TOTP app.
 */

// Generate a cryptographically random Base32 secret (20 bytes = 160 bits)
export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes)
}

// Verify a 6-digit TOTP code (checks current window ± 1 for clock drift)
export async function verifyTOTP(secret, token) {
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let delta = -1; delta <= 1; delta++) {
    const expected = await generateTOTP(secret, counter + delta)
    if (expected === token.replace(/\s/g, '')) return true
  }
  return false
}

// Generate a TOTP code for a given counter value
async function generateTOTP(secret, counter) {
  const keyBytes = base32Decode(secret)
  const counterBytes = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, counterBytes)
  const hmac = new Uint8Array(sig)
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) <<  8) |
    ((hmac[offset + 3] & 0xff))
  ) % 1_000_000
  return String(code).padStart(6, '0')
}

// Build an otpauth:// URI that QR code scanners / Authenticator apps understand
export function buildOtpAuthUri(secret, email, issuer = 'SchedulePlanner') {
  const label = encodeURIComponent(`${issuer}:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

// Build a QR code image URL using Google Charts API (fetched by the browser, not the server)
export function buildQRUrl(otpUri) {
  const encoded = encodeURIComponent(otpUri)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`
}

// ── Base32 helpers ──────────────────────────────────────────────────────────
const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes) {
  let bits = 0, value = 0, output = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += B32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += B32_CHARS[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(input) {
  const str = input.toUpperCase().replace(/=+$/, '')
  const bytes = []
  let bits = 0, value = 0
  for (let i = 0; i < str.length; i++) {
    const idx = B32_CHARS.indexOf(str[i])
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

// ── Account storage helpers ─────────────────────────────────────────────────
const ACCOUNTS_KEY = 'sp_accounts'

export function getAccounts() {
  return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
}

export function saveAccount(email, passwordHash, totpSecret) {
  const accounts = getAccounts()
  accounts.push({ email, passwordHash, totpSecret, createdAt: new Date().toISOString() })
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function findAccount(email) {
  return getAccounts().find(a => a.email.toLowerCase() === email.toLowerCase()) || null
}

export function accountExists(email) {
  return !!findAccount(email)
}

// Simple hash — good enough for localStorage (not a real backend)
export async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
