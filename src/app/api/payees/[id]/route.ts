import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'

// PUT /api/payees/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const { id } = await params
    const body = await request.json()

    const payee = await prisma.payee.update({
      where: { id },
      data: {
        ...body,
        userId,
      }
    })
    return NextResponse.json({ payee })
  } catch (error) {
    console.error('Error updating payee:', error)
    return NextResponse.json({ error: 'Failed to update payee' }, { status: 500 })
  }
}

// DELETE /api/payees/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authenticateRequest(request.headers)
    const { id } = await params
    await prisma.payee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payee:', error)
    return NextResponse.json({ error: 'Failed to delete payee' }, { status: 500 })
  }
}


