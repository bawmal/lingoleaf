// netlify/functions/create-lifetime-checkout.js
// Creates a Stripe checkout session for lifetime deal purchase

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };
        }

        if (!process.env.STRIPE_LIFETIME_PRICE_ID) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lifetime price not configured' }) };
        }

        // Create Stripe Checkout Session for one-time payment
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: process.env.STRIPE_LIFETIME_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.URL || 'https://lingoleaf.ai'}/lifetime-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://lingoleaf.ai'}/lifetime`,
            metadata: {
                type: 'lifetime_deal'
            }
        });

        console.log(`✅ Lifetime checkout session created: ${session.id}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                sessionId: session.id,
                url: session.url 
            })
        };
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
