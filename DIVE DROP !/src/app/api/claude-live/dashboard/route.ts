import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'live',
    server: 'http://localhost:3000',
    dashboard_url: '/claude-live',
    api: {
      events: '/api/claude-live/events',
      summary: '/api/claude-live/summary'
    },
    features: [
      'Real-time tool call tracking',
      'File change monitoring',
      'Git operations logging',
      'Task progress tracking',
      'Error capture',
      'Performance metrics'
    ]
  });
}
