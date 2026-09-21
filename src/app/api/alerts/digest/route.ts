import { NextResponse } from 'next/server';
import { generateDailyDigestHTML } from '@/lib/email-digest';
import rawPermits from '@/data/permits.json';
import { Permit, SubtradeKey } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, savedSearchName, subtrades, minValue } = body as {
      email?: string;
      savedSearchName?: string;
      subtrades?: SubtradeKey[];
      minValue?: number;
    };

    const targetEmail = email || 'contractor@okanagan-builders.ca';
    const targetSearchName = savedSearchName || 'Okanagan High-Value Commercial Pipeline';

    let permits = (rawPermits as unknown as Permit[]);

    if (subtrades && subtrades.length > 0) {
      permits = permits.filter(p => p.trades.some(t => subtrades.includes(t.subtrade_key)));
    }
    if (minValue && minValue > 0) {
      permits = permits.filter(p => p.estimated_value >= minValue);
    }

    const htmlContent = generateDailyDigestHTML({
      recipientEmail: targetEmail,
      savedSearchName: targetSearchName,
      hubName: 'The Okanagan Valley Hub',
      matchedPermits: permits
    });

    // Check if Resend API key is available
    const resendKey = process.env.RESEND_API_KEY;
    let emailDispatched = false;

    if (resendKey && !resendKey.includes('mock') && !resendKey.includes('demo')) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'alerts@buildpermitpro.ca',
            to: targetEmail,
            subject: `[BPP 6:00 AM Alert] ${permits.length} New Permits in ${targetSearchName}`,
            html: htmlContent
          })
        });
        emailDispatched = resendRes.ok;
      } catch (sendErr) {
        console.warn('Resend API dispatch failed:', sendErr);
      }
    }

    return NextResponse.json({
      success: true,
      emailDispatched,
      permitCount: permits.length,
      recipient: targetEmail,
      htmlPreview: htmlContent
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
