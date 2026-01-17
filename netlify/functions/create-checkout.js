const Stripe = require('stripe');
const fetch = require('node-fetch');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Amplitude tracking helper
const AMPLITUDE_API_KEY = 'b9405679c32380d513ae4af253c2d6df';
async function trackAmplitudeEvent(eventName, userId, eventProperties = {}) {
  try {
    await fetch('https://api2.amplitude.com/2/httpapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: AMPLITUDE_API_KEY,
        events: [{
          user_id: userId,
          event_type: eventName,
          event_properties: eventProperties
        }]
      })
    });
  } catch (err) {
    console.log('Amplitude tracking error:', err.message);
  }
}

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, userId, plantId } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: email,
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            metadata: {
                userId: userId || '',
                plantId: plantId || '',
            },
            success_url: `${process.env.URL || 'https://lingoleaf.ai'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://lingoleaf.ai'}/payment-cancelled`,
            subscription_data: {
                metadata: {
                    userId: userId || '',
                    plantId: plantId || '',
                },
            },
        });

        // Track checkout started in Amplitude
        await trackAmplitudeEvent('Checkout Started', email, {
          session_id: session.id,
          plant_id: plantId || null
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
                sessionId: session.id,
                url: session.url 
            })
        };
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
