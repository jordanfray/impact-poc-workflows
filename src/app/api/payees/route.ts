import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { authenticateRequest } from '../../../lib/auth'

// GET /api/payees - List payees for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const payees = await (prisma as any).payee.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ payees })
  } catch (error) {
    console.error('Error fetching payees:', error)
    return NextResponse.json({ error: 'Failed to fetch payees' }, { status: 500 })
  }
}

// POST /api/payees - Create a new payee
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticateRequest(request.headers)
    const body = await request.json()
    const {
      name,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      achAccountNumber,
      achRoutingNumber,
    } = body || {}

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const payee = await (prisma as any).payee.create({
      data: {
        userId,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || 'US',
        achAccountNumber: achAccountNumber || null,
        achRoutingNumber: achRoutingNumber || null,
      }
    })

    return NextResponse.json({ payee }, { status: 201 })
  } catch (error) {
    console.error('Error creating payee:', error)
    return NextResponse.json({ error: 'Failed to create payee' }, { status: 500 })
  }
}


