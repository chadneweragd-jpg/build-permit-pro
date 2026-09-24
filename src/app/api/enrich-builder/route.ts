import { NextRequest, NextResponse } from 'next/server';
import { enrichBuilderProfile } from '@/lib/enrichment/builder-enrichment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_name, companyName, city } = body;
    const targetName = company_name || companyName;

    if (!targetName || typeof targetName !== 'string' || !targetName.trim()) {
      return NextResponse.json(
        { error: 'Missing company_name in request body' },
        { status: 400 }
      );
    }

    const enriched = await enrichBuilderProfile(targetName.trim(), city || 'Kelowna');
    return NextResponse.json({
      success: true,
      builder: enriched
    });
  } catch (err: any) {
    console.error('Builder enrichment API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to enrich builder' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company_name') || searchParams.get('company');
    const city = searchParams.get('city') || 'Kelowna';

    if (!company || !company.trim()) {
      return NextResponse.json(
        { error: 'Missing company_name query parameter' },
        { status: 400 }
      );
    }

    const enriched = await enrichBuilderProfile(company.trim(), city);
    return NextResponse.json({
      success: true,
      builder: enriched
    });
  } catch (err: any) {
    console.error('Builder enrichment GET API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to enrich builder' },
      { status: 500 }
    );
  }
}
