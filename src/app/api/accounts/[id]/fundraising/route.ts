import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

// GET/PUT fundraising settings for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id } = await params

    // Public access: allow reading if fundraiser is public
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const settings = await prisma.fundraisingSettings.findUnique({ where: { accountId: id } })
      if (!settings || !settings.enabled || settings.publishStatus !== 'PUBLIC') {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })
      }
      // Compute donation and match totals, plus raised amount
      const [donationAgg, donationCount, matchCreditAgg, balance] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { accountId: id, status: 'CLEARED', type: 'DONATION' },
        }),
        prisma.transaction.count({ where: { accountId: id, status: 'CLEARED', type: 'DONATION' } }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { accountId: id, status: 'CLEARED', groupRole: 'MATCH_CREDIT' },
        }),
        prisma.account.findUnique({ where: { id }, select: { balance: true } })
      ])
      const donationTotal = Number(donationAgg._sum.amount || 0)
      const matchTotal = Number(matchCreditAgg._sum.amount || 0)
      const raised = donationTotal + matchTotal
      return NextResponse.json({ settings, raised, donationTotal, matchTotal, donationCount, balance: Number(balance?.balance || 0) })
    }

    // Authenticated access (owner)
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to account
    const account = await prisma.account.findFirst({
      where: { id, users: { some: { userId: user.id } } },
      select: { id: true }
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const settings = await prisma.fundraisingSettings.findUnique({ where: { accountId: id } })
    const widgets = await prisma.fundraisingWidget.findMany({ where: { accountId: id }, orderBy: { createdAt: 'desc' } })
    // Owner view: donation/match totals and current balance
    const [donationAgg, donationCount, matchCreditAgg, balance] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { accountId: id, status: 'CLEARED', type: 'DONATION' } }),
      prisma.transaction.count({ where: { accountId: id, status: 'CLEARED', type: 'DONATION' } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { accountId: id, status: 'CLEARED', groupRole: 'MATCH_CREDIT' } }),
      prisma.account.findUnique({ where: { id }, select: { balance: true } })
    ])
    const donationTotal = Number(donationAgg._sum.amount || 0)
    const matchTotal = Number(matchCreditAgg._sum.amount || 0)
    const raised = donationTotal + matchTotal

    return NextResponse.json({ settings, widgets, donationTotal, donationCount, matchTotal, raised, balance: Number(balance?.balance || 0) })
  } catch (error) {
    console.error('Fundraising GET error:', error)
    return NextResponse.json({ error: 'Failed to load fundraising settings' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify account access
    const account = await prisma.account.findFirst({
      where: { id, users: { some: { userId: user.id } } },
      select: { id: true }
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const updated = await prisma.fundraisingSettings.upsert({
      where: { accountId: id },
      update: {
        enabled: body.enabled ?? undefined,
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        imageUrl: body.imageUrl ?? undefined,
        goal: body.goal !== undefined && body.goal !== null ? body.goal : undefined,
        publishStatus: body.publishStatus ?? undefined,
        thankYouMessage: body.thankYouMessage ?? undefined,
        matchingEnabled: body.matchingEnabled ?? undefined,
        matchingPercent: body.matchingPercent ?? undefined,
        matchingFromAccountId: body.matchingFromAccountId ?? undefined,
      },
      create: {
        accountId: id,
        enabled: !!body.enabled,
        title: body.title ?? null,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        goal: body.goal ?? null,
        publishStatus: body.publishStatus ?? 'UNLISTED',
        thankYouMessage: body.thankYouMessage ?? undefined,
        matchingEnabled: body.matchingEnabled ?? false,
        matchingPercent: body.matchingPercent ?? null,
        matchingFromAccountId: body.matchingFromAccountId ?? null,
      },
    })

    return NextResponse.json({ settings: updated })
  } catch (error) {
    console.error('Fundraising PUT error:', error)
    return NextResponse.json({ error: 'Failed to save fundraising settings' }, { status: 500 })
  }
}


