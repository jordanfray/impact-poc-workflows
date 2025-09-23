import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest, generateApiKey } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, prefix: true, lastFour: true, createdAt: true, lastUsedAt: true, revokedAt: true, expiresAt: true }
    })
    return NextResponse.json({ keys })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const body = await request.json()
    const { name, expiresAt } = body
    const gen = generateApiKey()
    const created = await prisma.apiKey.create({
      data: { userId, name: name || 'API Key', prefix: gen.prefix, lastFour: gen.lastFour, hashedKey: gen.hashed, expiresAt: expiresAt ? new Date(expiresAt) : null }
    })
    // Return the plain key once on creation
    return NextResponse.json({ key: { id: created.id, name: created.name, plain: gen.plain, prefix: created.prefix, lastFour: created.lastFour, createdAt: created.createdAt } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    // Soft revoke
    const key = await prisma.apiKey.findFirst({ where: { id, userId } })
    if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}


