import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserCoins, creditUserCoins } from '@/lib/user-store'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('API/user/coins GET: Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coins = await getUserCoins(user.id)
    console.log('API/user/coins GET: User', user.id, 'coins:', coins);
    return NextResponse.json({ coins })
  } catch (error) {
    console.error('API/user/coins GET: Error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch coins' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('API/user/coins POST: Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await req.json()
    console.log('API/user/coins POST: User', user.id, 'requested to credit amount:', amount);

    if (typeof amount !== 'number' || amount <= 0) {
      console.log('API/user/coins POST: Invalid amount', amount);
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const newBalance = await creditUserCoins(user.id, amount)
    console.log('API/user/coins POST: User', user.id, 'new balance:', newBalance);
    return NextResponse.json({ newBalance })
  } catch (error) {
    console.error('API/user/coins POST: Error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to credit coins' },
      { status: 500 }
    )
  }
}
