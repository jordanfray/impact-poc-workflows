import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'

// POST /api/accounts/[id]/transfer - Transfer funds between accounts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate via API key or user token
    const auth = await authenticateRequest(request.headers)

    // If using API key, fetch a service user context (owner of the key)
    let userId = auth.userId
    let userEmail: string | null = null
    if (!auth.usingApiKey) {
      const token = request.headers.get('authorization')!.replace('Bearer ', '')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      userEmail = user?.email || null
    }

    // Await params
    const { id: fromAccountId } = await params

    // Parse request body
    const body = await request.json()
    const { toAccountId, amount } = body

    if (!toAccountId || !amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Valid toAccountId and amount are required' }, { status: 400 })
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 })
    }

    // Verify user has access to both accounts
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({
        where: {
          id: fromAccountId,
          users: auth.usingApiKey ? undefined : { some: { userId } }
        }
      }),
      prisma.account.findFirst({
        where: {
          id: toAccountId,
          users: auth.usingApiKey ? undefined : { some: { userId } }
        }
      })
    ])

    if (!fromAccount) {
      return NextResponse.json({ error: 'Source account not found or access denied' }, { status: 404 })
    }

    if (!toAccount) {
      return NextResponse.json({ error: 'Destination account not found or access denied' }, { status: 404 })
    }

    // Check if source account has sufficient funds
    const fromBalance = Number(fromAccount.balance)
    if (fromBalance < amount) {
      return NextResponse.json({ 
        error: `Insufficient funds. Available balance: $${fromBalance.toFixed(2)}` 
      }, { status: 400 })
    }

    // Perform the transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer transaction for source account (negative amount)
      const fromTransferTransaction = await tx.transaction.create({
        data: {
          accountId: fromAccountId,
          amount: -Math.abs(amount),
          type: 'TRANSFER',
          status: 'CLEARED',
          transferFromAccountId: fromAccountId,
          transferToAccountId: toAccountId
        }
      })

      // Create transfer transaction for destination account (positive amount)
      const toTransferTransaction = await tx.transaction.create({
        data: {
          accountId: toAccountId,
          amount: Math.abs(amount),
          type: 'TRANSFER',
          status: 'CLEARED',
          transferFromAccountId: fromAccountId,
          transferToAccountId: toAccountId
        }
      })

      // Update source account balance
      const updatedFromAccount = await tx.account.update({
        where: { id: fromAccountId },
        data: {
          balance: {
            decrement: amount
          }
        }
      })

      // Update destination account balance
      const updatedToAccount = await tx.account.update({
        where: { id: toAccountId },
        data: {
          balance: {
            increment: amount
          }
        }
      })

      return {
        fromAccount: updatedFromAccount,
        toAccount: updatedToAccount,
        fromTransferTransaction,
        toTransferTransaction
      }
    })

    console.log(`✅ TRANSFER completed: ${formatCurrency(amount)} from ${fromAccount.nickname} to ${toAccount.nickname} (${auth.usingApiKey ? 'via API key' : `for user ${userEmail}`})`)

    return NextResponse.json({ 
      ...result,
      message: 'Transfer completed successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Error processing transfer:', error)
    return NextResponse.json(
      { error: 'Failed to process transfer' },
      { status: 500 }
    )
  }
}
