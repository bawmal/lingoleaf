const Stripe = require('stripe');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase client
const SUPABASE_URL = process.env.DB_URL;
const SUPABASE_KEY = process.env.DB_API_KEY;

// Generate a unique lifetime code
function generateLifetimeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
    let code = 'LINGO-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Send lifetime code email via Resend
async function sendLifetimeCodeEmail(email, code) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
        console.log('RESEND_API_KEY not set; skipping email.');
        return { skipped: true };
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', Arial, sans-serif; background-color: #F0F7F1;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F7F1;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <tr>
                        <td align="center" style="background: linear-gradient(180deg, #18DA63 0%, #0BBA68 100%); padding: 50px 40px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">🎉 Welcome to LingoLeaf!</h1>
                            <p style="margin: 16px 0 0 0; color: rgba(255,255,255,0.9); font-size: 18px;">Your Lifetime Deal is Ready</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 24px 0;">
                                Thank you for purchasing LingoLeaf Lifetime! Here's your unique redemption code:
                            </p>
                            
                            <div style="background: linear-gradient(135deg, #F0FDF4, #D4ECD9); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Lifetime Code</p>
                                <h2 style="margin: 0; font-size: 36px; color: #02B91A; font-weight: 700; letter-spacing: 2px;">${code}</h2>
                            </div>
                            
                            <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 24px 0;">
                                <strong>Next step:</strong> Visit the link below to redeem your code and activate your lifetime access:
                            </p>
                            
                            <div style="text-align: center; margin-bottom: 24px;">
                                <a href="https://lingoleaf.ai/redeem" style="display: inline-block; background: linear-gradient(135deg, #18DA63, #02B91A); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">Redeem Your Code →</a>
                            </div>
                            
                            <p style="font-size: 14px; color: #666; margin: 0;">
                                Keep this email safe - your code can only be used once.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #0BBA68; padding: 30px;">
                            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">© 2025 LingoLeaf. Your Plants, With a Voice.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
    
    try {
        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'LingoLeaf <noreply@lingoleaf.ai>',
                to: [email],
                subject: '🎉 Your LingoLeaf Lifetime Code is Ready!',
                html
            })
        });
        
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Resend API error: ${resp.status} ${text}`);
        }
        
        const json = await resp.json();
        console.log(`✅ Lifetime code email sent to ${email}. Id: ${json.id}`);
        return { ok: true, id: json.id };
    } catch (err) {
        console.error('❌ Failed to send lifetime code email:', err.message);
        return { ok: false, error: err.message };
    }
}

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
            
            // Check if this is a lifetime deal purchase
            if (session.metadata?.type === 'lifetime_deal' && session.mode === 'payment') {
                console.log('Processing lifetime deal purchase...');
                const customerEmail = session.customer_details?.email || session.customer_email;
                
                if (!customerEmail) {
                    console.error('No customer email found for lifetime deal');
                    break;
                }
                
                try {
                    // Generate unique code
                    const code = generateLifetimeCode();
                    
                    // Store code in database
                    const supabase = createClient(
                        process.env.SUPABASE_URL || SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY
                    );
                    
                    const { error: insertError } = await supabase
                        .from('lifetime_codes')
                        .insert({
                            code: code,
                            source: 'stripe',
                            is_used: false
                        });
                    
                    if (insertError) {
                        console.error('Failed to insert lifetime code:', insertError);
                        throw insertError;
                    }
                    
                    // Send email with code
                    await sendLifetimeCodeEmail(customerEmail, code);
                    
                    console.log(`✅ Lifetime deal processed for ${customerEmail}, code: ${code}`);
                } catch (error) {
                    console.error('Error processing lifetime deal:', error);
                }
                break;
            }
            
            // Regular subscription checkout
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
