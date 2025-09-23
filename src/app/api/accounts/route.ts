import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import { n8nAutomation } from '@/lib/n8n-integration'
import { authenticateRequest } from '@/lib/auth'

// Generate a random account number (for demo purposes)
function generateAccountNumber(): string {
  // Generate a 10-digit account number
  const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString()
  return accountNumber
}

// Generate a default account nickname
function generateDefaultNickname(existingCount: number): string {
  const accountTypes = ['Checking', 'Savings', 'Business', 'Personal']
  const type = accountTypes[existingCount % accountTypes.length]
  const suffix = existingCount > 3 ? ` ${Math.floor(existingCount / 4) + 1}` : ''
  return `${type} Account${suffix}`
}

// GET /api/accounts - List user's accounts
export async function GET(request: NextRequest) {
  try {
    // Support API key (X-API-Key) or Supabase JWT
    const auth = await authenticateRequest(request.headers)
    const userId = auth.userId

    // Get user's accounts through the AccountUser junction table
    const accounts = await prisma.account.findMany({
      where: {
        users: {
          some: { userId }
        }
      },
      include: {
        users: { where: { userId } },
        _count: { select: { transactions: true, cards: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST /api/accounts - Create new account
export async function POST(request: NextRequest) {
  try {
    // Lightweight debugging for n8n → Impact calls
    const debugCorrelationId = request.headers.get('x-correlation-id') || `n8n-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const authHeaderPreview = request.headers.get('authorization')?.slice(0, 16) || null
    const hasApiKeyHeader = !!(request.headers.get('x-api-key') || request.headers.get('X-API-Key'))
    const idempotencyKey = request.headers.get('idempotency-key') || null
    console.log('[n8n-debug] /api/accounts POST headers', {
      correlationId: debugCorrelationId,
      hasApiKeyHeader,
      authHeaderPreview,
      idempotencyKey
    })
    // Support API key (X-API-Key) or Supabase JWT
    const auth = await authenticateRequest(request.headers)
    const userId = auth.userId
    let userEmail: string | null = null
    let userContext: any = undefined
    if (!auth.usingApiKey) {
      const token = request.headers.get('authorization')!.replace('Bearer ', '')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      userEmail = user?.email || null
      if (user) {
        const fullName = (user.user_metadata as any)?.full_name || null
        const firstName = (user.user_metadata as any)?.first_name || (fullName ? String(fullName).split(' ')[0] : null)
        const lastName = (user.user_metadata as any)?.last_name || (fullName ? String(fullName).split(' ').slice(1).join(' ') || null : null)
        const phone = (user.user_metadata as any)?.phone || null
        userContext = {
          id: user.id,
          email: user.email || null,
          firstName,
          lastName,
          fullName,
          phone,
        }
      }
    }

    // Parse request body for optional nickname
    let requestBody: { nickname?: string } = {}
    try {
      requestBody = await request.json()
    } catch {
      // If no body or invalid JSON, use empty object
    }

    // Generate account details
    const accountNumber = generateAccountNumber()
    let nickname = requestBody.nickname?.trim()
    
    // If no nickname provided, generate a default one
    if (!nickname) {
      const existingAccountsCount = await prisma.accountUser.count({
        where: {
          userId: userId
        }
      })
      nickname = generateDefaultNickname(existingAccountsCount)
    }

    // Create the account and link it to the user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the account
      const account = await tx.account.create({
        data: {
          nickname: nickname || 'Account',
          accountNumber,
          balance: 0
        }
      })

      // Link the user to the account
      await tx.accountUser.create({
        data: {
          userId: userId,
          accountId: account.id
        }
      })

      return account
    })

    console.log(`✅ Account created: ${result.nickname} (${result.accountNumber}) for ${auth.usingApiKey ? 'API key user' : userEmail}`)

    // Trigger n8n automation for new account (with user context)
    try {
      await n8nAutomation.onAccountCreated(result, userContext)
      console.log('🤖 n8n account creation automation triggered')
    } catch (error) {
      console.warn('⚠️ n8n automation failed (non-blocking):', error)
    }

    const res = NextResponse.json({ 
      account: result,
      message: 'Account created successfully',
      correlationId: debugCorrelationId
    }, { status: 201 })
    res.headers.set('X-Correlation-Id', debugCorrelationId)
    return res

  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
