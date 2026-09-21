import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_bpp';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

export const STRIPE_PLANS = {
  solo: {
    name: 'Regional Solo (Okanagan Hub)',
    amountCAD: 12900, // in cents ($129.00 CAD)
    priceId: process.env.STRIPE_PRICE_SOLO || 'price_mock_solo_129'
  },
  pro_scout: {
    name: 'Regional Pro / Scout (Okanagan Hub)',
    amountCAD: 19900, // in cents ($199.00 CAD)
    priceId: process.env.STRIPE_PRICE_PRO || 'price_mock_pro_199'
  },
  supplier: {
    name: 'Provincial Supplier (All BC Hubs)',
    amountCAD: 49900, // in cents ($499.00 CAD)
    priceId: process.env.STRIPE_PRICE_SUPPLIER || 'price_mock_supplier_499'
  }
};
