import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

// POST /api/accounts/[id]/transactions - Create a new transaction (deposit)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔄 POST /api/accounts/[id]/transactions called')
  console.log('📋 Request params:', params)
  
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header check:', { hasAuthHeader: !!authHeader, startsWithBearer: authHeader?.startsWith('Bearer ') })
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header')
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    // Create a server-side Supabase client with the user's token
    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token extracted, creating Supabase client...')
    
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
    
    console.log('👤 Getting user from Supabase...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 User check:', { hasUser: !!user, userId: user?.id, authError: authError?.message })
    
    if (authError || !user) {
      console.error('❌ User authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    console.log('🏦 Checking account access...', { accountId: params.id, userId: user.id })
    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
        users: {
          some: {
            userId: user.id
          }
        }
      }
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
          accountId: params.id,
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
          id: params.id
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

    console.log(`✅ ${type} transaction created: $${amount} for account ${account.nickname} (${user.email})`)

    const responseData = {
      transaction: result.transaction,
      account: result.account,
      message: `${type.toLowerCase()} processed successfully`
    }
    console.log('📤 Sending response:', responseData)

    return NextResponse.json(responseData, { status: 201 })

  } catch (error) {
    console.error('❌ ERROR creating transaction:', error)
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: 'Failed to process transaction', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/accounts/[id]/transactions - Get account transactions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify user has access to this account
    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
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

    // Get transactions for this account
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: params.id
      },
      include: {
        card: true,
        check: {
          include: {
            recipient: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
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
