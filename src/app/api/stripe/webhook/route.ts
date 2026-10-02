import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// AUDIT FIX (2026-10-02): this handler previously only console.log'd every subscription event
// and never touched the database -- there was no code path by which a real purchase could ever
// change what a user is allowed to see (Section 3.2's "Read user.allowed_regions from the
// authenticated profile" had nothing to read from a paying customer). It now upserts
// user_profiles.allowed_regions / subscription_status / subscription_tier using the service
// role key, which is the only key allowed to write those columns under the RLS policies added
// in supabase/migrations/20261002_add_allowed_regions.sql.
function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function grantEntitlement(userId: string | null | undefined, tier: string, hubId: string, customerId?: string, subscriptionId?: string) {
  if (!userId) {
    console.warn('[Stripe Webhook] checkout.session.completed had no client_reference_id (userId) -- cannot grant entitlement.');
    return;
  }
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn('[Stripe Webhook] Supabase service role not configured -- entitlement not persisted.');
    return;
  }

  // 'supplier' (Provincial Enterprise) unlocks every region; 'solo' unlocks just the purchased hub.
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('allowed_regions')
    .eq('id', userId)
    .maybeSingle();

  let allowedRegions: string[] = existing?.allowed_regions || ['kelowna'];
  if (tier === 'supplier') {
    allowedRegions = ['all'];
  } else if (hubId && !allowedRegions.includes('all') && !allowedRegions.includes(hubId)) {
    allowedRegions = [...allowedRegions, hubId];
  }

  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      subscription_status: 'active',
      subscription_tier: tier,
      allowed_regions: allowedRegions,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[Stripe Webhook] Failed to persist entitlement:', error.message);
  } else {
    console.log(`[Stripe Webhook] Granted ${tier} entitlement (regions: ${allowedRegions.join(', ')}) to user ${userId}.`);
  }
}

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
      const tier = session.metadata?.tier || 'solo';
      const hubId = session.metadata?.hubId || '';
      await grantEntitlement(session.client_reference_id, tier, hubId, session.customer, session.subscription);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      console.log(`[Stripe Webhook] Subscription status updated: ${sub.status}`);
      const supabase = getServiceSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ subscription_status: sub.status })
          .eq('stripe_subscription_id', sub.id);
        if (error) console.error('[Stripe Webhook] Failed to update subscription status:', error.message);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`[Stripe Webhook] Subscription canceled: ${sub.id}`);
      const supabase = getServiceSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ subscription_status: 'canceled', allowed_regions: ['kelowna'] })
          .eq('stripe_subscription_id', sub.id);
        if (error) console.error('[Stripe Webhook] Failed to revoke entitlement:', error.message);
      }
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
