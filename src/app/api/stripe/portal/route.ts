import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock')) {
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: 'cus_demo_contractor',
          return_url: origin
        });
        return NextResponse.json({ url: portalSession.url });
      } catch (err: any) {
        console.warn('Customer portal live call failed:', err.message);
      }
    }

    return NextResponse.json({ url: `${origin}/?portal=open&demo=true` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
