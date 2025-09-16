import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

// GET /api/accounts/[id] - Get specific account
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

    const account = await prisma.account.findFirst({
      where: {
        id,
        users: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        users: true,
        transactions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10, // Latest 10 transactions
          include: {
            card: true,
            check: {
              include: {
                recipient: true
              }
            },
            transferFromAccount: {
              select: {
                id: true,
                nickname: true,
                accountNumber: true
              }
            },
            transferToAccount: {
              select: {
                id: true,
                nickname: true,
                accountNumber: true
              }
            }
          }
        },
        cards: {
          where: {
            isActive: true
          }
        },
        _count: {
          select: {
            transactions: true,
            cards: true
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
}

// PUT /api/accounts/[id] - Update account (nickname, etc.)
export async function PUT(
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

    const body = await request.json()
    const { nickname } = body

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'Valid nickname is required' }, { status: 400 })
    }

    // Await params
    const { id } = await params
    
    // Verify user has access to this account
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        users: {
          some: {
            userId: user.id
          }
        }
      }
    })

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Update the account
    const updatedAccount = await prisma.account.update({
      where: {
        id
      },
      data: {
        nickname: nickname.trim()
      },
      include: {
        users: true,
        _count: {
          select: {
            transactions: true,
            cards: true
          }
        }
      }
    })

    console.log(`✅ Account updated: ${updatedAccount.nickname} for user ${user.email}`)

    return NextResponse.json({ 
      account: updatedAccount,
      message: 'Account updated successfully'
    })

  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts/[id] - Delete account (only if balance is 0)
export async function DELETE(
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
    
    // Check if account exists and user has access
    const account = await prisma.account.findFirst({
      where: {
        id,
        users: {
          some: {
            userId: user.id
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if balance is zero (handle Decimal type)
    const balance = Number(account.balance)
    if (balance !== 0) {
      return NextResponse.json({ 
        error: `Account cannot be deleted. Balance must be zero. Current balance: $${balance.toFixed(2)}` 
      }, { status: 400 })
    }

    // Delete the account and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete account users (relationships)
      await tx.accountUser.deleteMany({
        where: { accountId: id }
      })

      // Delete transactions
      await tx.transaction.deleteMany({
        where: { accountId: id }
      })

      // Delete cards
      await tx.card.deleteMany({
        where: { accountId: id }
      })

      // Finally delete the account
      await tx.account.delete({
        where: { id }
      })
    })

    console.log(`✅ Account deleted: ${account.nickname} (${account.accountNumber}) for user ${user.email}`)

    return NextResponse.json({ 
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
