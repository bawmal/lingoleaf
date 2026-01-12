const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase client
const SUPABASE_URL = process.env.DB_URL;
const SUPABASE_KEY = process.env.DB_API_KEY;

async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase error: ${error}`);
    }
    return response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
        // Verify webhook signature
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle the event
    switch (stripeEvent.type) {
        case 'checkout.session.completed': {
            const session = stripeEvent.data.object;
            console.log('Checkout completed:', session.id);
            
            // Get customer email and subscription ID
            const customerEmail = session.customer_email;
            const subscriptionId = session.subscription;
            const customerId = session.customer;
            
            // Update user's subscription status in database
            try {
                // Update all plants with this email to have active subscription
                await supabaseRequest(
                    `plants?email=eq.${encodeURIComponent(customerEmail)}`,
                    'PATCH',
                    {
                        subscription_status: 'active',
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        subscription_started_at: new Date().toISOString()
                    }
                );
                console.log(`Updated subscription for email ${customerEmail}`);
            } catch (error) {
                console.error('Error updating user subscription:', error);
            }
            break;
        }

        case 'customer.subscription.updated': {
            const subscription = stripeEvent.data.object;
            console.log('Subscription updated:', subscription.id);
            
            // Update subscription status
            try {
                await supabaseRequest(
                    `plants?stripe_subscription_id=eq.${subscription.id}`,
                    'PATCH',
                    {
                        subscription_status: subscription.status
                    }
                );
            } catch (error) {
                console.error('Error updating subscription status:', error);
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = stripeEvent.data.object;
            console.log('Subscription cancelled:', subscription.id);
            
            // Mark subscription as cancelled
            try {
                await supabaseRequest(
                    `plants?stripe_subscription_id=eq.${subscription.id}`,
                    'PATCH',
                    {
                        subscription_status: 'cancelled',
                        subscription_ended_at: new Date().toISOString()
                    }
                );
            } catch (error) {
                console.error('Error updating cancelled subscription:', error);
            }
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = stripeEvent.data.object;
            console.log('Payment failed for invoice:', invoice.id);
            
            // Mark subscription as past_due
            try {
                await supabaseRequest(
                    `plants?stripe_customer_id=eq.${invoice.customer}`,
                    'PATCH',
                    {
                        subscription_status: 'past_due'
                    }
                );
            } catch (error) {
                console.error('Error updating payment failed status:', error);
            }
            break;
        }

        default:
            console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};
