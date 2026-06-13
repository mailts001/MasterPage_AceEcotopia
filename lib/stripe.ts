import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PLANS = {
  citizen: {
    name: 'Citizen',
    price: 1900,          // $19.00 in cents
    currency: 'usd',
    interval: 'month' as const,
    description: 'Full access to all 4 X68 districts + 3 API keys + 10,000 calls/day',
    features: [
      'All 4 district APIs',
      '10,000 API calls/day',
      '3 API keys',
      'Priority alerts',
      '100 Nexus Credits/month',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 9900,          // $99.00 in cents
    currency: 'usd',
    interval: 'month' as const,
    description: 'Unlimited API access + dedicated support + custom integrations',
    features: [
      'Unlimited API calls',
      '10 API keys',
      'Dedicated support',
      'Custom district integrations',
      '500 Nexus Credits/month',
    ],
  },
}
