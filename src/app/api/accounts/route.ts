import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

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

    // Get user's accounts through the AccountUser junction table
    const accounts = await prisma.account.findMany({
      where: {
        users: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        users: {
          where: {
            userId: user.id
          }
        },
        _count: {
          select: {
            transactions: true,
            cards: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create new account
export async function POST(request: NextRequest) {
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

    // Get user's existing account count for nickname generation
    const existingAccountsCount = await prisma.accountUser.count({
      where: {
        userId: user.id
      }
    })

    // Generate account details
    const accountNumber = generateAccountNumber()
    const nickname = generateDefaultNickname(existingAccountsCount)

    // Create the account and link it to the user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the account
      const account = await tx.account.create({
        data: {
          nickname,
          accountNumber,
          balance: 0
        }
      })

      // Link the user to the account
      await tx.accountUser.create({
        data: {
          userId: user.id,
          accountId: account.id
        }
      })

      return account
    })

    console.log(`✅ Account created: ${result.nickname} (${result.accountNumber}) for user ${user.email}`)

    return NextResponse.json({ 
      account: result,
      message: 'Account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
