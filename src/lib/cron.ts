import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import { today } from './db'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// WhatsApp message sending (Twilio integration for production)
export async function sendWhatsAppMessage(to: string, body: string) {
  // In production with Twilio configured, use Twilio
  // For now, log to console in dev mode
  if (process.env.NODE_ENV !== 'production' || !process.env.TWILIO_ACCOUNT_SID) {
    console.log(`📱 [DEV] WhatsApp to ${to}:`, body)
    return { success: true, dev: true }
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body,
    })
    console.log('✅ WhatsApp sent:', message.sid)
    return { success: true, sid: message.sid }
  } catch (error) {
    console.error('❌ WhatsApp send failed:', error)
    return { success: false, error }
  }
}

export async function sendDailyReminder() {
  const todayStr = today()
  
  const openTasks = await prisma.entry.findMany({
    where: { 
      date: todayStr, 
      type: 'task', 
      status: 'open' 
    },
    orderBy: { priority: 'asc' },
    take: 5,
  })

  const myPhone = process.env.MY_PHONE || '+41799651071'

  if (openTasks.length === 0) {
    return sendWhatsAppMessage(myPhone, 
      '📋 End of day check:\n\nNo pending tasks today. Nice work! 🎉\n\nReply with "habit: [name]" to add a new habit.'
    )
  }

  const topTasks = openTasks.slice(0, 3).map((t, i) => `• ${t.content}`).join('\n')
  
  return sendWhatsAppMessage(myPhone, 
    `📋 End of day check:\n\nUnfinished tasks (${openTasks.length}):\n${topTasks}\n\nReply "move [n]" to reschedule, "drop [n]" to discard, or "habit: [name]" to add a habit.`
  )
}

export async function sendWeeklyReview() {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const recentEntries = await prisma.entry.findMany({
    where: { date: { gte: weekAgo.toISOString().split('T')[0] } },
    orderBy: { date: 'desc' },
  })

  const unfinished = recentEntries.filter(e => e.status === 'open').length
  const completed = recentEntries.filter(e => e.status === 'done').length
  const ideas = recentEntries.filter(e => e.type === 'idea').length

  return sendWhatsAppMessage(
    process.env.MY_PHONE || '+41799651071',
    `📊 Weekly Review\n\n• Completed: ${completed} tasks\n• Still open: ${unfinished} tasks\n• Ideas captured: ${ideas}\n\nReply with your top 3 priorities for next week, or "skip" to defer.`
  )
}

export function setupCronJobs() {
  // Daily reminder at 8:30 PM CET
  cron.schedule('30 20 * * *', async () => {
    console.log('📋 Running daily reminder...')
    await sendDailyReminder()
  }, {
    timezone: 'Europe/Zurich'
  })

  // Weekly review on Friday at 6 PM CET
  cron.schedule('0 18 * * 5', async () => {
    console.log('📊 Running weekly review...')
    await sendWeeklyReview()
  }, {
    timezone: 'Europe/Zurich'
  })

  console.log('⏰ Cron jobs scheduled')
}