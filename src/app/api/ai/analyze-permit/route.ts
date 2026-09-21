import { NextResponse } from 'next/server';
import { analyzePermitWithGemini, isGeminiConfigured } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { permitNumber, address, workClass, estimatedValue, description } = body;

    if (!description) {
      return NextResponse.json({ error: 'Permit description is required' }, { status: 400 });
    }

    const analysis = await analyzePermitWithGemini({
      permitNumber: permitNumber || 'BP-2026-UNKNOWN',
      address: address || 'Kelowna, BC',
      workClass: workClass || 'Commercial',
      estimatedValue: estimatedValue || 1000000,
      description
    });

    return NextResponse.json({
      success: true,
      analysis,
      geminiConnected: isGeminiConfigured
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
