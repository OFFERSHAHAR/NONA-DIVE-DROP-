import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory event store (in production: database)
let events: Array<{
  timestamp: string;
  type: string;
  tool?: string;
  file?: string;
  status: string;
  duration_ms?: number;
  details?: any;
}> = [];

// Add event to log file
function logEvent(event: any) {
  events.unshift(event); // Most recent first
  events = events.slice(0, 1000); // Keep last 1000 events

  // Also write to file for persistence
  const logFile = path.join(process.cwd(), '.claude-events.jsonl');
  fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const filter = searchParams.get('tool');

  let filtered = events;
  if (filter) {
    filtered = events.filter(e => e.tool?.toLowerCase().includes(filter.toLowerCase()));
  }

  return NextResponse.json({
    events: filtered.slice(0, limit),
    total: filtered.length,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate event structure
    if (!body.type || !body.status) {
      return NextResponse.json({ error: 'Missing type or status' }, { status: 400 });
    }

    const event = {
      timestamp: new Date().toISOString(),
      ...body,
    };

    logEvent(event);

    return NextResponse.json({
      success: true,
      event,
      total_events: events.length
    });
  } catch (error) {
    console.error('Event logging error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}

// GET /api/claude-live/events/summary
export async function GET_SUMMARY() {
  const tools = new Map<string, number>();
  const files = new Map<string, number>();

  events.forEach(e => {
    if (e.tool) tools.set(e.tool, (tools.get(e.tool) || 0) + 1);
    if (e.file) files.set(e.file, (files.get(e.file) || 0) + 1);
  });

  return {
    total_events: events.length,
    tools: Array.from(tools.entries()).map(([name, count]) => ({ name, count })),
    files: Array.from(files.entries()).map(([name, count]) => ({ name, count })),
  };
}
