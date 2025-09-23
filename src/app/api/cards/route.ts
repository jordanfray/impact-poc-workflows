import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import { n8nAutomation } from '@/lib/n8n-integration'

// GET /api/cards - List all cards for the authenticated user
export async function GET(request: NextRequest) {
  console.log('🔄 GET /api/cards called')

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

    // Get all cards for the user (through their accounts)
    console.log('💳 Fetching user cards...')
    const cards = await prisma.card.findMany({
      where: {
        account: {
          users: {
            some: {
              userId: user.id
            }
          }
        }
      },
      include: {
        account: {
          select: {
            id: true,
            nickname: true,
            accountNumber: true
          }
        },
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('💳 Cards fetched:', { count: cards.length })

    return NextResponse.json({
      cards: cards.map((card: any) => ({
        id: card.id,
        accountId: card.accountId,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isActive: card.isActive,
        dailyLimit: (card as any).dailyLimit ?? null,
        monthlyLimit: (card as any).monthlyLimit ?? null,
        allowedCategories: (card as any).allowedCategories ?? [],
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        account: card.account,
        transactionCount: card._count.transactions
      }))
    })

  } catch (error) {
    console.error('❌ Error fetching cards:', error)
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }
}

// POST /api/cards - Create a new card
export async function POST(request: NextRequest) {
  console.log('🔄 POST /api/cards called')

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
    const { accountId, cardholderName, dailyLimit, monthlyLimit, allowedCategories } = body

    console.log('📦 Request body:', { accountId, cardholderName })

    // Validate input
    if (!accountId || !cardholderName) {
      console.error('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate expiry date (4 years from today)
    const currentDate = new Date()
    const expiryDate = new Date(currentDate)
    expiryDate.setFullYear(currentDate.getFullYear() + 4)

    const expiryMonth = expiryDate.getMonth() + 1 // getMonth() returns 0-11, we want 1-12
    const expiryYear = expiryDate.getFullYear()

    console.log('📅 Generated expiry date:', { expiryMonth, expiryYear, currentDate: currentDate.toISOString(), expiryDate: expiryDate.toISOString() })

    // Generate random 16-digit card number
    const generateCardNumber = () => {
      let cardNumber = ''
      for (let i = 0; i < 16; i++) {
        cardNumber += Math.floor(Math.random() * 10)
      }
      return cardNumber
    }

    const cardNumber = generateCardNumber()
    console.log('💳 Generated card number:', cardNumber)

    // Verify user has access to the account
    console.log('🏦 Checking account access...', { accountId, userId: user.id })
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        users: {
          some: {
            userId: user.id
          }
        }
      }
    })

    if (!account) {
      console.error('❌ Account not found or access denied')
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 })
    }

    // Prepare user context for n8n
    let userContext: any = undefined
    if (user) {
      const fullName = (user.user_metadata as any)?.full_name || null
      const firstName = (user.user_metadata as any)?.first_name || (fullName ? String(fullName).split(' ')[0] : null)
      const lastName = (user.user_metadata as any)?.last_name || (fullName ? String(fullName).split(' ').slice(1).join(' ') || null : null)
      const phone = (user.user_metadata as any)?.phone || null
      userContext = { id: user.id, email: user.email || null, firstName, lastName, fullName, phone }
    }

    // Create the card
    console.log('💳 Creating card...')
    const card = await prisma.card.create({
      data: ({
        accountId,
        cardNumber,
        cardholderName,
        expiryMonth,
        expiryYear,
        dailyLimit: dailyLimit !== undefined && dailyLimit !== null ? Number(dailyLimit) : null,
        monthlyLimit: monthlyLimit !== undefined && monthlyLimit !== null ? Number(monthlyLimit) : null,
        allowedCategories: Array.isArray(allowedCategories) ? allowedCategories : []
      }) as any,
      include: {
        account: {
          select: {
            id: true,
            nickname: true,
            accountNumber: true
          }
        }
      }
    })

    console.log('💳 Card created:', { id: card.id, cardNumber: card.cardNumber })

    // Trigger n8n automation for card issuance
    try {
      await n8nAutomation.onCardIssued(accountId, card.id, userContext)
      console.log('🤖 n8n card issuance automation triggered')
    } catch (error) {
      console.warn('⚠️ n8n automation failed (non-blocking):', error)
    }

    return NextResponse.json({
      card: ({
        id: card.id,
        accountId: card.accountId,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isActive: card.isActive,
        dailyLimit: (card as any).dailyLimit ?? null,
        monthlyLimit: (card as any).monthlyLimit ?? null,
        allowedCategories: (card as any).allowedCategories ?? [],
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        account: (card as any).account
      })
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating card:', error)
    const message = (error as any)?.message || 'Failed to create card'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
