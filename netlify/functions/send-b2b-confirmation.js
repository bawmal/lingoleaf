// netlify/functions/send-b2b-confirmation.js
// Sends B2B signup confirmation email via Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendConfirmationEmail(email, businessName, confirmationUrl) {
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your LingoLeaf Business Account</title>
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
                                        <span style="color: rgba(255,255,255,0.9); font-size: 14px; display: block;">for Business</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin: 30px 0 10px 0; color: #ffffff; font-size: 32px; font-weight: 700;">Welcome, ${businessName}! 🎉</h1>
                            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">Please confirm your email to get started</p>
                        </td>
                    </tr>
                    
                    <!-- Main Message -->
                    <tr>
                        <td style="padding: 40px 40px 24px 40px;">
                            <p style="font-size: 18px; line-height: 1.6; color: #1C1C1C; margin: 0; font-weight: 500;">
                                Thanks for signing up for LingoLeaf for Business! Click the button below to confirm your email and access your dashboard.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #18DA63 0%, #02B91A 100%); color: #ffffff; padding: 18px 48px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 18px;">
                                Confirm Email & Get Started →
                            </a>
                        </td>
                    </tr>
                    
                    <!-- What's Next -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; color: #1C1C1C; font-size: 18px; font-weight: 700;">
                                            What happens next?
                                        </h3>
                                        <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #555555;">
                                            <strong>1.</strong> Confirm your email (click the button above)
                                        </p>
                                        <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #555555;">
                                            <strong>2.</strong> We'll assign a dedicated SMS number to your shop
                                        </p>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555555;">
                                            <strong>3.</strong> Start adding customers and sending plant care reminders!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #0BBA68; padding: 40px 40px 20px 40px;">
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
                            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                                <p style="margin: 0; color: #E7F1E9; font-size: 12px; line-height: 1.5;">
                                    © 2026 LingoLeaf. Questions? Reply to this email.
                                </p>
                            </div>
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
            subject: `Confirm your LingoLeaf Business account`,
            html: emailHtml
        })
    });

    const result = await response.json();
    return { ok: response.ok, result };
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { email, businessName, confirmationUrl } = JSON.parse(event.body);

        if (!email || !businessName || !confirmationUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: email, businessName, confirmationUrl' })
            };
        }

        const { ok, result } = await sendConfirmationEmail(email, businessName, confirmationUrl);

        if (!ok) {
            console.error('Resend error:', result);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to send email', details: result })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, messageId: result.id })
        };

    } catch (error) {
        console.error('Send confirmation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
