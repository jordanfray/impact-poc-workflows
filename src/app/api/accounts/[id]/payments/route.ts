import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'

// POST /api/accounts/[id]/payments
// Body: { method: 'ACH' | 'CHECK', payeeId: string, amount: number, memo?: string }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(request.headers)
    const { id: accountId } = await params
    const body = await request.json()
    const { method, payeeId, amount, memo } = body || {}

    if (!payeeId || !amount || amount <= 0 || !method) {
      return NextResponse.json({ error: 'method, payeeId and positive amount are required' }, { status: 400 })
    }

    // Validate account access when not API key
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        users: auth.usingApiKey ? undefined : { some: { userId: auth.userId } }
      }
    })
    if (!account) return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 })

    // Validate payee ownership
    const payee = await prisma.payee.findFirst({ where: { id: payeeId, userId: auth.userId } })
    if (!payee) return NextResponse.json({ error: 'Payee not found' }, { status: 404 })

    // Check funds
    const fromBalance = Number(account.balance)
    if (fromBalance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
    }

    // Simulate payment processing; for CHECK, create Check + Transaction; for ACH, just transaction
    const result = await prisma.$transaction(async (tx) => {
      let checkId: string | null = null
      if (method === 'CHECK') {
        const check = await tx.check.create({
          data: {
            payeeId: payee.id,
            amount: Math.abs(amount),
            memo: memo || null,
            status: 'PENDING'
          }
        })
        checkId = check.id
      }

      const transaction = await tx.transaction.create({
        data: {
          accountId,
          amount: -Math.abs(amount),
          type: method === 'CHECK' ? 'CHECK_PAYMENT' : 'ACH_PAYMENT',
          status: 'CLEARED',
          checkId: checkId || undefined,
          payeeId: payee.id
        }
      })

      const updated = await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: amount } }
      })

      return { transaction, account: updated }
    })

    return NextResponse.json({ ...result, message: 'Payment submitted' }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}


