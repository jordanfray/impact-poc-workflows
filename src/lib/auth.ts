import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

export interface AuthResult {
  userId: string
  usingApiKey: boolean
}

// Verify either Supabase JWT (Authorization: Bearer) or X-API-Key
export async function authenticateRequest(headers: Headers): Promise<AuthResult> {
  // Prefer API key if present
  const apiKey = headers.get('x-api-key') || headers.get('X-API-Key')
  if (apiKey) {
    const key = await prisma.apiKey.findFirst({ where: { hashedKey: hashApiKey(apiKey) } })
    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt < new Date())) {
      throw new Error('Invalid API key')
    }
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    return { userId: key.userId, usingApiKey: true }
  }

  const authHeader = headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { userId: user.id, usingApiKey: false }
}

// Simple stable hash for API keys (not cryptographically strong; replace with bcrypt/scrypt if needed)
export function hashApiKey(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return `h${Math.abs(hash)}`
}

export function generateApiKey(): { plain: string; prefix: string; lastFour: string; hashed: string } {
  const prefix = 'impk'
  const random = cryptoRandom(32)
  const plain = `${prefix}_${random}`
  const lastFour = random.slice(-4)
  const hashed = hashApiKey(plain)
  return { plain, prefix, lastFour, hashed }
}

function cryptoRandom(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}


