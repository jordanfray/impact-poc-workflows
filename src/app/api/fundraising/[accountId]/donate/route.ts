import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

// Public donation endpoint (no auth required for demo), but accepts optional X-API-Key for service calls
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const body = await request.json()
    const amount = Number(body.amount)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    const settings = await prisma.fundraisingSettings.findUnique({ where: { accountId } })
    if (!settings || !settings.enabled) {
      return NextResponse.json({ error: 'Fundraiser not enabled' }, { status: 400 })
    }

    // Create a donation as a DONATION on the fundraising account
    const result = await prisma.$transaction(async (tx) => {
      // Create group to link donation + match transfers
      const group = await tx.transactionGroup.create({
        data: { purpose: 'DONATION_MATCH' }
      })

      const correlationId = request.headers.get('x-correlation-id') || randomUUID()

      const donationTx = await tx.transaction.create({
        data: {
          accountId,
          amount: Math.abs(amount),
          type: 'DONATION',
          status: 'CLEARED',
          groupId: group.id,
          groupRole: 'DONATION',
          correlationId,
        }
      })

      const updatedFund = await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: Math.abs(amount) } }
      })

      let matching: { matchedAmount: number } | null = null
      if (settings.matchingEnabled && settings.matchingPercent && settings.matchingFromAccountId) {
        const matchedAmount = Math.round((amount * settings.matchingPercent) / 100)
        if (matchedAmount > 0) {
          // debit matching account, credit fundraising account
          await tx.transaction.create({
            data: {
              accountId: settings.matchingFromAccountId,
              amount: -Math.abs(matchedAmount),
              type: 'TRANSFER',
              status: 'CLEARED',
              transferFromAccountId: settings.matchingFromAccountId,
              transferToAccountId: accountId,
              groupId: group.id,
              groupRole: 'MATCH_DEBIT',
              correlationId,
            }
          })
          await tx.transaction.create({
            data: {
              accountId,
              amount: Math.abs(matchedAmount),
              type: 'TRANSFER',
              status: 'CLEARED',
              transferFromAccountId: settings.matchingFromAccountId,
              transferToAccountId: accountId,
              groupId: group.id,
              groupRole: 'MATCH_CREDIT',
              correlationId,
            }
          })

          await tx.account.update({ where: { id: settings.matchingFromAccountId }, data: { balance: { decrement: matchedAmount } } })
          await tx.account.update({ where: { id: accountId }, data: { balance: { increment: matchedAmount } } })
          matching = { matchedAmount }
        }
      }

      return { donationTx, updatedFund, matching }
    })

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    console.error('Donation error:', error)
    return NextResponse.json({ error: 'Failed to process donation' }, { status: 500 })
  }
}


