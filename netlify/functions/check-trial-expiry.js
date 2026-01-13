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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your LingoLeaf Trial Has Ended</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', Arial, sans-serif; background-color: #F0F7F1;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F7F1;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(180deg, #18DA63 0%, #0BBA68 100%); padding: 50px 40px;">
                            <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="background: #ffffff; width: 50px; height: 50px; border-radius: 14px; text-align: center; vertical-align: middle;">
                                        <span style="font-size: 28px;">🌱</span>
                                    </td>
                                    <td style="padding-left: 12px;">
                                        <span style="font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; color: #ffffff;">LingoLeaf</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin: 30px 0 10px 0; color: #ffffff; font-size: 32px; font-weight: 700;">${plantName ? `${plantName} misses you!` : 'Your trial has ended'} 😢</h1>
                            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">But it's not too late to keep the conversation going</p>
                        </td>
                    </tr>
                    
                    <!-- Main Message -->
                    <tr>
                        <td style="padding: 40px 40px 24px 40px;">
                            <p style="font-size: 18px; line-height: 1.6; color: #1C1C1C; margin: 0; font-weight: 500;">
                                We hope you enjoyed getting to know ${plantName ? '<strong style="color: #02B91A;">' + plantName + "</strong>'s" : "your plant's"} personality over the past 30 days!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Trial Ended Notice -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; border: 2px solid #E7F1E9;">
                                <tr>
                                    <td style="padding: 24px; border-left: 4px solid #FF9500; border-radius: 16px;">
                                        <h3 style="margin: 0 0 12px 0; color: #1C1C1C; font-size: 18px; font-weight: 700;">
                                            ⏰ Your Free Trial Has Ended
                                        </h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555555;">
                                            Your watering reminders have been paused. Subscribe now to continue receiving personalized care tips and keep your plants thriving!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Pricing Card -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(180deg, #E7F1E9 0%, #D4ECD9 100%); border-radius: 24px;">
                                <tr>
                                    <td align="center" style="padding: 32px 24px;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                            🌿 Continue Your Plant Journey
                                        </p>
                                        <h2 style="margin: 0 0 8px 0; color: #02B91A; font-size: 48px; font-weight: 700; font-family: 'DM Serif Display', Georgia, serif;">
                                            $2.99<span style="font-size: 18px; color: #555555;">/month</span>
                                        </h2>
                                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #555555;">
                                            Cancel anytime. No commitments.
                                        </p>
                                        <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #18DA63 0%, #02B91A 100%); color: #ffffff; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px;">
                                            Continue My Plant Care →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Features -->
                    <tr>
                        <td style="padding: 16px 40px 24px 40px;">
                            <h2 style="margin: 0 0 24px 0; text-align: center; color: #1C1C1C; font-size: 24px; font-weight: 700;">
                                What You'll Get
                            </h2>
                        </td>
                    </tr>
                    
                    <!-- Feature 1 -->
                    <tr>
                        <td style="padding: 0 40px 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width: 40px; height: 40px; background: #02B91A; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-size: 20px;">🌱</td>
                                                <td style="padding-left: 16px;">
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1C1C1C; font-size: 16px;">Up to 5 Plants</p>
                                                    <p style="margin: 0; font-size: 14px; color: #555555;">Each with their own unique personality</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Feature 2 -->
                    <tr>
                        <td style="padding: 0 40px 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width: 40px; height: 40px; background: #02B91A; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-size: 20px;">🌦️</td>
                                                <td style="padding-left: 16px;">
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1C1C1C; font-size: 16px;">Weather-Smart Reminders</p>
                                                    <p style="margin: 0; font-size: 14px; color: #555555;">Adjusts based on your local conditions</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Feature 3 -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width: 40px; height: 40px; background: #02B91A; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-size: 20px;">💬</td>
                                                <td style="padding-left: 16px;">
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1C1C1C; font-size: 16px;">SMS That Feel Personal</p>
                                                    <p style="margin: 0; font-size: 14px; color: #555555;">Your plant talks to you in their own voice</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #18DA63 0%, #02B91A 100%); color: #ffffff; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px;">
                                Subscribe Now - $2.99/month →
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #0BBA68; padding: 40px 40px 20px 40px; position: relative; overflow: hidden;">
                            <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="background: #ffffff; width: 32px; height: 32px; border-radius: 10px; text-align: center; vertical-align: middle;">
                                        <span style="font-size: 18px;">🌱</span>
                                    </td>
                                    <td style="padding-left: 10px;">
                                        <span style="font-family: 'DM Serif Display', Georgia, serif; font-size: 24px; color: #ffffff;">LingoLeaf</span>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 12px 0 20px 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your Plants, With a Voice</p>
                            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px; margin-bottom: 16px;">
                                <p style="margin: 0; color: #E7F1E9; font-size: 12px; line-height: 1.5;">
                                    © 2025 LingoLeaf. Questions? Reply to this email.
                                </p>
                            </div>
                            <!-- Decorative LingoLeaf Text -->
                            <p style="margin: 0; font-family: 'DM Serif Display', Georgia, serif; font-size: 72px; color: #17DA62; opacity: 0.4; letter-spacing: -2px; line-height: 1;">LingoLeaf</p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
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
