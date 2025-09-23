import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'

// GET: list notifications for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } })
    return NextResponse.json({ notifications, unreadCount })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST: create a notification (supports API key)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const body = await request.json()
    const { title, description } = body || {}
    if (!title || !description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
    }
    const notification = await prisma.notification.create({
      data: { userId, title, description }
    })
    return NextResponse.json({ notification }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

// PUT: mark all as read
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}

