// Scheduled function to check for expired trials and send email notifications
// Run daily via Netlify scheduled function or cron

const SUPABASE_URL = process.env.DB_URL;
const SUPABASE_KEY = process.env.DB_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

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
    return response.json();
}

async function sendTrialExpiryEmail(email, plantName) {
    const paymentUrl = 'https://lingoleaf.ai/#pricing';
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #02B91A; }
        .content { background: #f9f9f9; border-radius: 16px; padding: 32px; margin-bottom: 30px; }
        h1 { color: #1C1C1C; font-size: 24px; margin-bottom: 16px; }
        p { color: #555; margin-bottom: 16px; }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #02B91A, #18DA63); 
            color: white !important; 
            padding: 16px 32px; 
            border-radius: 50px; 
            text-decoration: none; 
            font-weight: bold;
            margin: 20px 0;
        }
        .price { font-size: 32px; color: #02B91A; font-weight: bold; }
        .features { list-style: none; padding: 0; }
        .features li { padding: 8px 0; color: #555; }
        .features li::before { content: "✓ "; color: #02B91A; font-weight: bold; }
        .footer { text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌿 LingoLeaf</div>
        </div>
        
        <div class="content">
            <h1>Your free trial has ended${plantName ? `, and ${plantName} misses you!` : '!'}</h1>
            
            <p>We hope you enjoyed getting to know your plant's personality over the past 30 days. Your trial period has now ended.</p>
            
            <p>To continue receiving personalized plant care reminders and keep your green friends thriving, subscribe to LingoLeaf:</p>
            
            <div style="text-align: center;">
                <div class="price">$2.99<span style="font-size: 16px; color: #555;">/month</span></div>
                <a href="${paymentUrl}" class="cta-button">Continue My Plant Care →</a>
            </div>
            
            <ul class="features">
                <li>Up to 5 plants with unique personalities</li>
                <li>Weather-smart watering reminders</li>
                <li>Seasonal dormancy detection</li>
                <li>SMS notifications that feel personal</li>
            </ul>
            
            <p style="text-align: center; color: #999; font-size: 14px;">Cancel anytime. No commitments.</p>
        </div>
        
        <div class="footer">
            <p>© 2025 LingoLeaf. Helping plants talk since day one.</p>
            <p>Questions? Reply to this email or visit <a href="https://lingoleaf.ai">lingoleaf.ai</a></p>
        </div>
    </div>
</body>
</html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'LingoLeaf <hello@lingoleaf.ai>',
            to: email,
            subject: `Your LingoLeaf trial has ended${plantName ? ` - ${plantName} misses you!` : ''}`,
            html: emailHtml
        })
    });

    return response.ok;
}

exports.handler = async (event) => {
    try {
        // Find plants where:
        // 1. Trial started more than 30 days ago
        // 2. No active subscription
        // 3. Haven't been notified yet (trial_expiry_notified is null or false)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const expiredTrials = await supabaseRequest(
            `plants?trial_started_at=lt.${thirtyDaysAgo.toISOString()}&subscription_status=neq.active&trial_expiry_notified=is.null&select=id,user_email,plant_name`
        );

        if (!expiredTrials || expiredTrials.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No expired trials to notify', count: 0 })
            };
        }

        let sentCount = 0;
        const errors = [];

        for (const plant of expiredTrials) {
            if (!plant.user_email) continue;

            try {
                const sent = await sendTrialExpiryEmail(plant.user_email, plant.plant_name);
                
                if (sent) {
                    // Mark as notified
                    await supabaseRequest(
                        `plants?id=eq.${plant.id}`,
                        'PATCH',
                        { trial_expiry_notified: true }
                    );
                    sentCount++;
                }
            } catch (err) {
                errors.push({ plantId: plant.id, error: err.message });
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Trial expiry check complete',
                sent: sentCount,
                total: expiredTrials.length,
                errors: errors.length > 0 ? errors : undefined
            })
        };

    } catch (error) {
        console.error('Trial expiry check error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
