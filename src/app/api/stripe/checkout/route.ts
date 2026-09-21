import { NextResponse } from 'next/server';
import { stripe, STRIPE_PLANS } from '@/lib/stripe';
import { SubscriptionTier } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tier, hubId, returnUrl } = body as {
      tier: SubscriptionTier;
      hubId?: string;
      returnUrl?: string;
    };

    const plan = STRIPE_PLANS[tier] || STRIPE_PLANS.pro_scout;
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // If live Stripe is configured, create a real Stripe Checkout session
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock')) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'cad',
                product_data: {
                  name: `Build Permit Pro - ${plan.name}`,
                  description: `Subscription for ${tier === 'supplier' ? 'All Provincial Hubs' : 'The Okanagan Valley Hub'}. Includes live permit classification, heat maps, and mini-CRM.`
                },
                unit_amount: plan.amountCAD,
                recurring: { interval: 'month' }
              },
              quantity: 1
            }
          ],
          mode: 'subscription',
          success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&upgraded=true`,
          cancel_url: `${origin}/?canceled=true`
        });

        return NextResponse.json({ url: session.url, mock: false });
      } catch (stripeErr: any) {
        console.warn('Stripe checkout call failed, falling back to simulated checkout:', stripeErr.message);
      }
    }

    // Interactive Demo / Sandbox Checkout response
    return NextResponse.json({
      url: `${origin}/?tier=${tier}&upgraded=true&simulated=true`,
      mock: true,
      tier,
      message: `Simulated subscription activation for ${plan.name}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
