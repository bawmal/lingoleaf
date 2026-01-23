// Test script to generate and send a lifetime code
// Run with: node test-lifetime-email.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Generate a unique lifetime code
function generateLifetimeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
        console.log('❌ RESEND_API_KEY not set');
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
                        <td align="center" style="background: #F0FDF4; padding: 50px 40px; border-bottom: 4px solid #02B91A;">
                            <h1 style="margin: 0; color: #1C1C1C; font-size: 32px; font-weight: 700;">🎉 Welcome to LingoLeaf!</h1>
                            <p style="margin: 16px 0 0 0; color: #555555; font-size: 18px;">Your Lifetime Deal is Ready</p>
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
                                <a href="https://lingoleaf.ai/redeem" style="display: inline-block; background: #02B91A; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">Redeem Your Code →</a>
                            </div>
                            
                            <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 12px 0; text-align: center;">
                                Or copy this link: <a href="https://lingoleaf.ai/redeem" style="color: #02B91A; text-decoration: underline;">https://lingoleaf.ai/redeem</a>
                            </p>
                            
                            <p style="font-size: 14px; color: #666; margin: 0;">
                                Keep this email safe - your code can only be used once.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #F0FDF4; padding: 30px; border-top: 1px solid #E5E5E5;">
                            <p style="margin: 0; color: #666666; font-size: 14px;">© 2025 LingoLeaf. Your Plants, With a Voice.</p>
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
                subject: '🎉 Your LingoLeaf Lifetime Code is Ready! [TEST]',
                html,
                text: `🎉 Welcome to LingoLeaf!

Your Lifetime Deal is Ready

Thank you for purchasing LingoLeaf Lifetime! Here's your unique redemption code:

YOUR LIFETIME CODE
${code}

Next step: Visit the link below to redeem your code and activate your lifetime access:

👉 https://lingoleaf.ai/redeem

Keep this email safe - your code can only be used once.

© 2025 LingoLeaf. Your Plants, With a Voice.`
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

async function main() {
    const testEmail = 'bawmal@yahoo.com';
    
    console.log('🧪 Testing Lifetime Code Generation and Email...\n');
    
    // Generate code
    const code = generateLifetimeCode();
    console.log(`📝 Generated code: ${code}`);
    
    // Create Supabase client
    const supabase = createClient(
        process.env.DB_URL,
        process.env.DB_API_KEY
    );
    
    // Insert code into database
    console.log('💾 Inserting code into database...');
    const { data, error: insertError } = await supabase
        .from('lifetime_codes')
        .insert({
            code: code,
            source: 'test',
            is_used: false
        })
        .select();
    
    if (insertError) {
        console.error('❌ Failed to insert code:', insertError);
        process.exit(1);
    }
    
    console.log('✅ Code inserted successfully');
    
    // Send email
    console.log(`📧 Sending email to ${testEmail}...`);
    const emailResult = await sendLifetimeCodeEmail(testEmail, code);
    
    if (emailResult.ok) {
        console.log('\n✅ TEST COMPLETE!');
        console.log(`\nCode: ${code}`);
        console.log(`Email sent to: ${testEmail}`);
        console.log(`\nNext steps:`);
        console.log(`1. Check ${testEmail} for the email`);
        console.log(`2. Visit https://lingoleaf.ai/redeem (or localhost)`);
        console.log(`3. Enter the code to test redemption`);
    } else if (emailResult.skipped) {
        console.log('\n⚠️  Email skipped (RESEND_API_KEY not set)');
        console.log(`\nCode generated: ${code}`);
        console.log(`You can manually test redemption at /redeem`);
    } else {
        console.log('\n❌ Email failed:', emailResult.error);
        console.log(`\nCode still generated: ${code}`);
        console.log(`You can manually test redemption at /redeem`);
    }
}

main().catch(console.error);
