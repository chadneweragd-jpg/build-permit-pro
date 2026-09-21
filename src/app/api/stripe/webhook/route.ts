import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: any;

  try {
    if (webhookSecret && !webhookSecret.includes('mock')) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload);
    }
  } catch (err: any) {
    console.error(`Stripe webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle relevant subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`[Stripe Webhook] Subscription checkout completed for customer ${session.customer}`);
      // In production with Supabase: update user_profiles table with subscription status
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      console.log(`[Stripe Webhook] Subscription status updated: ${sub.status}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`[Stripe Webhook] Subscription canceled: ${sub.id}`);
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
