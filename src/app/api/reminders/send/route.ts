import { NextRequest, NextResponse } from 'next/server'
import { sendDailyReminder, sendWeeklyReview } from '@/lib/cron'

export async function POST(request: NextRequest) {
  const { type } = await request.json()
  
  if (type === 'daily') {
    await sendDailyReminder()
    return NextResponse.json({ success: true, message: 'Daily reminder sent' })
  }
  
  if (type === 'weekly') {
    await sendWeeklyReview()
    return NextResponse.json({ success: true, message: 'Weekly review sent' })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}