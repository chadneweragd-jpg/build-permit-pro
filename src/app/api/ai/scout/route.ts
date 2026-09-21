import { NextResponse } from 'next/server';
import { askScoutAssistant } from '@/lib/scout-ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, history, context } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const response = await askScoutAssistant({ query, history, context });

    return NextResponse.json({
      success: true,
      ...response
    });
  } catch (error: any) {
    console.error('Error in Scout AI Assistant API:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
