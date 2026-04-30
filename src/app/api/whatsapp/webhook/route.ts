import { NextRequest, NextResponse } from 'next/server'

// WhatsApp webhook - NO LONGER USED
// OpenClaw handles WhatsApp natively. Messages from Jose come through the agent.
// This endpoint exists for documentation/compatibility only.
// 
// For capture, use one of these methods:
// 1. Direct: Send "task: your text" via WhatsApp - Hal processes and stores it
// 2. API: POST to /api/capture with { message: "task: your text" }

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    status: 'deprecated',
    message: 'WhatsApp capture is handled directly by the Hal agent. Use /api/capture for direct API access.'
  }, { status: 410 })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    note: 'WhatsApp webhook deprecated. Use /api/capture for capture API.',
    example: {
      method: 'POST',
      url: '/api/capture',
      body: { message: 'task: finish client deck' }
    }
  })
}