import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

// GET /api/cards/[id] - Get a specific card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 GET /api/cards/[id] called')

  const { id } = await params
  console.log('📋 Request params:', { id })

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

    // Get the card with user access verification
    console.log('💳 Fetching card...', { cardId: id, userId: user.id })
    const card = await prisma.card.findFirst({
      where: {
        id,
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
      }
    })

    if (!card) {
      console.error('❌ Card not found or access denied')
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 })
    }

    console.log('💳 Card fetched:', { id: card.id, cardNumber: card.cardNumber })

    return NextResponse.json({
      card: {
        id: card.id,
        accountId: card.accountId,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isActive: card.isActive,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        account: card.account,
        transactionCount: card._count.transactions
      }
    })

  } catch (error) {
    console.error('❌ Error fetching card:', error)
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 })
  }
}

// PUT /api/cards/[id] - Update a card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 PUT /api/cards/[id] called')

  const { id } = await params
  console.log('📋 Request params:', { id })

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
    const { cardholderName, isActive, dailyLimit, monthlyLimit, allowedCategories } = body

    console.log('📦 Request body:', { cardholderName, isActive })

    // Verify user has access to the card
    console.log('💳 Checking card access...', { cardId: id, userId: user.id })
    const existingCard = await prisma.card.findFirst({
      where: {
        id,
        account: {
          users: {
            some: {
              userId: user.id
            }
          }
        }
      }
    })

    if (!existingCard) {
      console.error('❌ Card not found or access denied')
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 })
    }

    // Update the card
    console.log('💳 Updating card...')
    const updateData: any = {}
    if (cardholderName !== undefined) updateData.cardholderName = cardholderName
    if (isActive !== undefined) updateData.isActive = isActive
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit === null ? null : Number(dailyLimit)
    if (monthlyLimit !== undefined) updateData.monthlyLimit = monthlyLimit === null ? null : Number(monthlyLimit)
    if (allowedCategories !== undefined) updateData.allowedCategories = Array.isArray(allowedCategories) ? allowedCategories : []

    const card = await prisma.card.update({
      where: {
        id
      },
      data: updateData,
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

    console.log('💳 Card updated:', { id: card.id, cardNumber: card.cardNumber })

    return NextResponse.json({
      card: {
        id: card.id,
        accountId: card.accountId,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isActive: card.isActive,
        dailyLimit: card.dailyLimit,
        monthlyLimit: card.monthlyLimit,
        allowedCategories: card.allowedCategories,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        account: card.account
      }
    })

  } catch (error) {
    console.error('❌ Error updating card:', error)
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
  }
}

// DELETE /api/cards/[id] - Delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 DELETE /api/cards/[id] called')

  const { id } = await params
  console.log('📋 Request params:', { id })

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

    // Verify user has access to the card
    console.log('💳 Checking card access...', { cardId: id, userId: user.id })
    const card = await prisma.card.findFirst({
      where: {
        id,
        account: {
          users: {
            some: {
              userId: user.id
            }
          }
        }
      }
    })

    if (!card) {
      console.error('❌ Card not found or access denied')
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 })
    }

    // Delete the card
    console.log('💳 Deleting card...')
    await prisma.card.delete({
      where: {
        id
      }
    })

    console.log('💳 Card deleted:', { id })

    return NextResponse.json({
      message: 'Card deleted successfully',
      cardId: id
    })

  } catch (error) {
    console.error('❌ Error deleting card:', error)
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 })
  }
}
