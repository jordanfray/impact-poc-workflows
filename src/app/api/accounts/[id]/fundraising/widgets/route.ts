import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

export async function POST(
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
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    // Access check
    const account = await prisma.account.findFirst({ where: { id, users: { some: { userId: user.id } } }, select: { id: true } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const widget = await prisma.fundraisingWidget.create({
      data: {
        accountId: id,
        name: body.name ?? 'Widget',
        embedId: body.embedId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        config: body.config ?? undefined,
      }
    })

    return NextResponse.json({ widget })
  } catch (error) {
    console.error('Widget POST error:', error)
    return NextResponse.json({ error: 'Failed to create widget' }, { status: 500 })
  }
}

export async function DELETE(
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
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const widgetId = searchParams.get('widgetId')
    if (!widgetId) return NextResponse.json({ error: 'widgetId is required' }, { status: 400 })

    // Ensure widget belongs to account and user has access
    const widget = await prisma.fundraisingWidget.findFirst({ where: { id: widgetId, accountId: id } })
    if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 })

    // Extra access guard
    const account = await prisma.account.findFirst({ where: { id, users: { some: { userId: user.id } } }, select: { id: true } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    await prisma.fundraisingWidget.delete({ where: { id: widgetId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Widget DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 })
  }
}


