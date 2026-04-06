import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripe
}

let supabaseClient: any = null
function getSupabase() {
  if (!supabaseClient && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return supabaseClient
}

// Product definitions
const PRODUCTS = {
  'combat-pdf': {
    name: 'Combat PDF Report',
    description: 'Full analysis formatted for your oncologist appointment',
    price: 2900, // $29.00 in cents
    mode: 'payment' as const,
  },
  'expert-review': {
    name: 'Expert Review - 48 Hour',
    description: 'Board-certified oncologist reviews your Combat analysis with written notes',
    price: 19900, // $199.00 in cents
    mode: 'payment' as const,
  },
  'expert-tony-magliocco': {
    name: 'Expert Consultation - Dr. Tony Magliocco',
    description: 'Personalized review from renowned pathologist and precision oncology expert',
    price: 65000, // $650.00 in cents
    mode: 'payment' as const,
  },
  'pro-monthly': {
    name: 'CancerCombat Pro',
    description: 'Unlimited Combat runs, PDF reports, and perspective tuning',
    price: 4900, // $49.00/month in cents
    mode: 'subscription' as const,
  },
}

export async function POST(request: NextRequest) {
  try {
    const stripeClient = getStripe()
    if (!stripeClient) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { productId, userId, email, combatResultId, metadata = {} } = body

    if (!productId || !PRODUCTS[productId as keyof typeof PRODUCTS]) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }

    const product = PRODUCTS[productId as keyof typeof PRODUCTS]
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opencancer.ai'

    // Build line item with optional recurring for subscriptions
    const priceData: any = {
      currency: 'usd',
      product_data: {
        name: product.name,
        description: product.description,
      },
      unit_amount: product.price,
    }
    if (product.mode === 'subscription') {
      priceData.recurring = { interval: 'month' }
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData, quantity: 1 }],
      mode: product.mode,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${productId}`,
      cancel_url: `${baseUrl}/checkout/cancel?product=${productId}`,
      customer_email: email || undefined,
      metadata: {
        productId,
        userId: userId || 'anonymous',
        combatResultId: combatResultId || '',
        ...metadata,
      },
    })

    // Log the checkout attempt (don't block on this)
    const supabase = getSupabase()
    if (userId && supabase) {
      supabase.from('purchases').insert({
        user_id: userId,
        product_id: productId,
        stripe_session_id: session.id,
        amount_cents: product.price,
        status: 'pending',
        combat_result_id: combatResultId || null,
        metadata: metadata,
      }).then(({ error }: { error: any }) => {
        if (error) console.error('Failed to log purchase:', error)
      })
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
