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

export async function POST(request: NextRequest) {
  const stripeClient = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeClient || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Update purchase status
        await supabase
          .from('purchases')
          .update({
            status: 'completed',
            stripe_payment_intent: session.payment_intent as string,
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id)

        // Handle specific product fulfillment
        const productId = session.metadata?.productId
        const userId = session.metadata?.userId
        const combatResultId = session.metadata?.combatResultId

        if (productId === 'expert-review' && combatResultId) {
          // Create expert consultation request
          const { error: consultError } = await supabase.from('expert_consultations').insert({
            user_id: userId !== 'anonymous' ? userId : null,
            user_email: session.customer_email,
            expert_id: 'async-expert',
            expert_name: 'Oncology Expert Panel',
            organization: 'opencancer.ai',
            combat_result_id: combatResultId,
            status: 'paid',
            stripe_session_id: session.id,
            price_cents: session.amount_total,
          })
          if (consultError) console.error('Failed to create expert consultation:', consultError)
        }

        if (productId === 'pro-monthly' && userId && userId !== 'anonymous') {
          // Upgrade user to pro
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'pro',
              subscription_started_at: new Date().toISOString(),
            })
            .eq('id', userId)
        }

        console.log(`Payment completed for ${productId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by stripe customer ID and downgrade
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_ended_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// App Router handles raw body automatically for webhooks
