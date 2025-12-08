import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 16

/**
 * Get encryption key from environment
 * Falls back to a derived key from SUPABASE_SERVICE_KEY if no dedicated key is set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY

  if (key) {
    // If key is provided, use it directly (should be 32 bytes hex encoded = 64 chars)
    if (key.length === 64) {
      return Buffer.from(key, 'hex')
    }
    // Otherwise derive a key from it
    return scryptSync(key, 'integration-salt', KEY_LENGTH)
  }

  // Fallback: derive from service role key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('No encryption key configured. Set INTEGRATION_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY')
  }

  return scryptSync(serviceKey, 'integration-salt', KEY_LENGTH)
}

/**
 * Encrypt sensitive data (tokens, API keys, etc.)
 * Returns a string in format: salt:iv:authTag:ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)

  // Derive a unique key for this encryption using the salt
  const derivedKey = scryptSync(key, salt, KEY_LENGTH)

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
  ciphertext += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Combine all parts
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext,
  ].join(':')
}

/**
 * Decrypt encrypted data
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()

  const [saltB64, ivB64, authTagB64, ciphertext] = encryptedData.split(':')

  if (!saltB64 || !ivB64 || !authTagB64 || !ciphertext) {
    throw new Error('Invalid encrypted data format')
  }

  const salt = Buffer.from(saltB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  // Derive the same key using the salt
  const derivedKey = scryptSync(key, salt, KEY_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Encrypt a JSON object
 */
export function encryptJson<T extends Record<string, unknown>>(data: T): string {
  return encrypt(JSON.stringify(data))
}

/**
 * Decrypt to a JSON object
 */
export function decryptJson<T extends Record<string, unknown>>(encryptedData: string): T {
  const plaintext = decrypt(encryptedData)
  return JSON.parse(plaintext) as T
}

/**
 * Encrypt OAuth tokens
 */
export function encryptTokens(tokens: {
  access_token: string
  refresh_token?: string
  expires_at?: number
}): {
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  token_expires_at: Date | null
} {
  return {
    access_token_encrypted: encrypt(tokens.access_token),
    refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    token_expires_at: tokens.expires_at ? new Date(tokens.expires_at * 1000) : null,
  }
}

/**
 * Decrypt OAuth tokens
 */
export function decryptTokens(encrypted: {
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  token_expires_at: Date | null
}): {
  access_token: string
  refresh_token: string | null
  expires_at: number | null
} {
  return {
    access_token: decrypt(encrypted.access_token_encrypted),
    refresh_token: encrypted.refresh_token_encrypted
      ? decrypt(encrypted.refresh_token_encrypted)
      : null,
    expires_at: encrypted.token_expires_at
      ? Math.floor(new Date(encrypted.token_expires_at).getTime() / 1000)
      : null,
  }
}

/**
 * Check if tokens are expired or expiring soon
 */
export function isTokenExpired(expiresAt: Date | null, bufferSeconds = 300): boolean {
  if (!expiresAt) return false

  const expirationTime = new Date(expiresAt).getTime()
  const now = Date.now()
  const buffer = bufferSeconds * 1000

  return now >= expirationTime - buffer
}
