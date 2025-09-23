import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/auth'
import { n8nAutomation } from '@/lib/n8n-integration'

// POST /api/accounts/[id]/transactions - Create a new transaction (deposit)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 POST /api/accounts/[id]/transactions called')

  const { id } = await params
  console.log('📋 Request params:', { id })
  
  try {
    // Authenticate via API key or user token
    const auth = await authenticateRequest(request.headers)
    let userId = auth.userId
    let userEmail: string | null = null
    let supabase: any = null
    let userContext: any = undefined
    if (!auth.usingApiKey) {
      const token = request.headers.get('authorization')!.replace('Bearer ', '')
      supabase = createClient(
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

    // Parse request body
    console.log('📦 Parsing request body...')
    const body = await request.json()
    console.log('📦 Request body:', body)
    const { amount, type = 'DEPOSIT', description } = body

    // Validate input
    console.log('✅ Validating input:', { amount, type, amountType: typeof amount })
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.error('❌ Invalid amount validation failed:', { amount, type: typeof amount })
      return NextResponse.json({ error: 'Valid amount is required and must be positive' }, { status: 400 })
    }

    if (!['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
      console.error('❌ Invalid transaction type:', type)
      return NextResponse.json({ error: 'Transaction type must be DEPOSIT or WITHDRAWAL' }, { status: 400 })
    }

    // Verify user has access to this account
    console.log('🏦 Checking account access...', { accountId: id, userId })
    const account = await prisma.account.findFirst({
      where: auth.usingApiKey ? { id } : { id, users: { some: { userId } } }
    })
    console.log('🏦 Account check result:', { hasAccount: !!account, accountId: account?.id, nickname: account?.nickname })

    if (!account) {
      console.error('❌ Account not found or access denied')
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 })
    }

    // Create transaction and update account balance in a database transaction
    console.log('💾 Starting database transaction...')
    const result = await prisma.$transaction(async (tx) => {
      console.log('💾 Creating transaction record...')
      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          accountId: id,
          amount: type === 'WITHDRAWAL' ? -Math.abs(amount) : Math.abs(amount),
          type: type as 'DEPOSIT' | 'WITHDRAWAL',
          status: 'CLEARED' // ACH deposits are immediately cleared for demo purposes
        }
      })
      console.log('💾 Transaction created:', { id: transaction.id, amount: transaction.amount })

      console.log('💰 Updating account balance...')
      // Update account balance
      const updatedAccount = await tx.account.update({
        where: {
          id: id
        },
        data: {
          balance: {
            increment: type === 'WITHDRAWAL' ? -Math.abs(amount) : Math.abs(amount)
          }
        }
      })
      console.log('💰 Account balance updated:', { newBalance: updatedAccount.balance })

      return { transaction, account: updatedAccount }
    })

    console.log(`✅ ${type} transaction created: $${amount} for account ${account.nickname} (${auth.usingApiKey ? 'via API key' : `for user ${userEmail}`})`)

    // Trigger n8n automation workflows
    try {
      await n8nAutomation.onTransactionCreated(result.transaction, result.account, userContext)

      // Check for low balance after withdrawal
      if (type === 'WITHDRAWAL') {
        const currentBalance = Number(result.account.balance)
        const lowBalanceThreshold = 100 // $100 threshold

        if (currentBalance < lowBalanceThreshold) {
          await n8nAutomation.onLowBalance(id, currentBalance, lowBalanceThreshold, userContext)
        }
      }
      
      console.log('🤖 n8n automation triggered successfully')
    } catch (error) {
      console.warn('⚠️ n8n automation failed (non-blocking):', error)
      // Don't fail the transaction if automation fails
    }

    const responseData = {
      transaction: result.transaction,
      account: result.account,
      message: `${type.toLowerCase()} processed successfully`
    }
    console.log('📤 Sending response:', responseData)

    return NextResponse.json(responseData, { status: 201 })

  } catch (error: unknown) {
    const err = error as any
    console.error('❌ ERROR creating transaction:', err)
    console.error('❌ Error details:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack
    })
    return NextResponse.json(
      { error: 'Failed to process transaction', details: err?.message },
      { status: 500 }
    )
  }
}

// GET /api/accounts/[id]/transactions - Get account transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    // Create a server-side Supabase client with the user's token
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params
    const { id } = await params

    // Verify user has access to this account
    const account = await prisma.account.findFirst({
      where: {
        id: id,
        users: {
          some: {
            userId: user.id
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 })
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Optional type filter (comma-separated list)
    const typeInParam = searchParams.get('typeIn')
    const typeIn = typeInParam ? typeInParam.split(',').map(t => t.trim()).filter(Boolean) as any[] : undefined

    // Get transactions for this account
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: id,
        ...(typeIn ? { type: { in: typeIn as any } } : {})
      },
      include: ({
        card: true,
        check: true,
        payee: true
      } as any),
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      transactions,
      count: transactions.length,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
