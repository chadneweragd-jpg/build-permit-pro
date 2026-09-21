import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

// Local fallback store in case table is pending creation
const inMemoryFeedbackStore: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_email, url, message, device_info, category } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const record = {
      id: `fb-${Date.now()}`,
      user_email: user_email || 'anonymous',
      url: url || '',
      message: message.trim(),
      device_info: device_info || {},
      category: category || 'bug',
      created_at: new Date().toISOString()
    };

    inMemoryFeedbackStore.unshift(record);
    console.log('[BPP Feedback Received]:', record);

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('user_feedback').insert({
          user_email: record.user_email,
          url: record.url,
          message: record.message,
          device_info: record.device_info,
          created_at: record.created_at
        });

        if (error) {
          console.warn('[BPP Feedback] Supabase user_feedback insert notice:', error.message);
        }
      } catch (dbErr) {
        console.warn('[BPP Feedback] Database error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thanks! Logged for the development team.',
      feedback: record
    });
  } catch (err: any) {
    console.error('Error handling feedback submission:', err);
    return NextResponse.json(
      { error: 'Failed to process feedback', details: err?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    total: inMemoryFeedbackStore.length,
    feedback: inMemoryFeedbackStore
  });
}
