// Test script to send a sample welcome email
require('dotenv').config();
const fetch = require('node-fetch');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function formatDuration(hours) {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days === 0) return `${hours} hours`;
  if (remainingHours === 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
  
  const halfDay = remainingHours >= 10 && remainingHours <= 14;
  return halfDay ? `${days} and a half days` : `${days} ${days === 1 ? 'day' : 'days'}`;
}

function createWelcomeEmailHtml(species, nickname, effectiveHours, isDryStatus = false, twilioNumber = null, slotIndex = 1) {
  const plantName = nickname || species;
  const duration = formatDuration(effectiveHours);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LingoLeaf</title>
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
                            <h1 style="margin: 30px 0 10px 0; color: #ffffff; font-size: 32px; font-weight: 700;">Welcome to LingoLeaf! 🎉</h1>
                            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your plant now has a voice</p>
                        </td>
                    </tr>
                    
                    <!-- Success Message -->
                    <tr>
                        <td style="padding: 40px 40px 24px 40px;">
                            <p style="font-size: 18px; line-height: 1.6; color: #1C1C1C; margin: 0; font-weight: 500;">
                                Great news! Your <strong style="color: #02B91A;">${species}</strong>${nickname ? ` (${nickname})` : ''} has been successfully registered!
                            </p>
                        </td>
                    </tr>
                    
                    ${twilioNumber ? `
                    <!-- Save Number Section -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(180deg, #E7F1E9 0%, #D4ECD9 100%); border-radius: 24px;">
                                <tr>
                                    <td align="center" style="padding: 32px 24px;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                            📞 Save This Number
                                        </p>
                                        <h2 style="margin: 0 0 12px 0; color: #02B91A; font-size: 36px; font-weight: 700; letter-spacing: 1px;">
                                            ${twilioNumber}
                                        </h2>
                                        <p style="margin: 0; font-size: 14px; color: #555555; line-height: 1.5;">
                                            This is <strong>${plantName}</strong>'s personal number (Plant ${slotIndex}).<br>Save it as "${plantName} 🌱" in your contacts!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    
                    <!-- First Watering Reminder -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; border: 2px solid #E7F1E9;">
                                <tr>
                                    <td style="padding: 24px; border-left: 4px solid #02B91A; border-radius: 16px;">
                                        <h3 style="margin: 0 0 12px 0; color: #1C1C1C; font-size: 18px; font-weight: 700;">
                                            ${isDryStatus ? '🚨 Immediate Text Message Sent!' : '⏰ Your First Watering Reminder'}
                                        </h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555555;">
                                            ${isDryStatus 
                                                ? `We've sent you an <strong>immediate text message</strong> because your soil is dry. Please water <strong>${plantName}</strong> right away and reply <strong>DONE</strong> to start your care schedule!`
                                                : `Expect a friendly reminder for <strong>${plantName}</strong> in about <strong style="color: #02B91A;">${duration}</strong>. We'll send you a text message asking you to check the soil!`
                                            }
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- How LingoLeaf Works -->
                    <tr>
                        <td style="padding: 16px 40px 24px 40px;">
                            <h2 style="margin: 0 0 24px 0; text-align: center; color: #1C1C1C; font-size: 24px; font-weight: 700;">
                                How LingoLeaf Works
                            </h2>
                        </td>
                    </tr>
                    
                    <!-- Steps -->
                    <tr>
                        <td style="padding: 0 40px 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width: 40px; height: 40px; background: #02B91A; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-weight: 700; font-size: 16px;">1</td>
                                                <td style="padding-left: 16px;">
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1C1C1C; font-size: 16px;">We'll ask you to check the soil</p>
                                                    <p style="margin: 0; font-size: 14px; color: #555555;">You'll get a text: <em>"Check my soil and reply: DRY or DAMP"</em></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Response Options -->
                    <tr>
                        <td style="padding: 0 40px 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td width="50%" style="padding-right: 8px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(255, 171, 52, 0.15); border-radius: 16px;">
                                            <tr>
                                                <td align="center" style="padding: 20px;">
                                                    <div style="font-size: 32px; margin-bottom: 8px;">🔥</div>
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #E35B00; font-size: 16px;">Reply "DRY"</p>
                                                    <p style="margin: 0; font-size: 13px; color: #E35B00;">Soil needs water</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="50%" style="padding-left: 8px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(23, 114, 218, 0.1); border-radius: 16px;">
                                            <tr>
                                                <td align="center" style="padding: 20px;">
                                                    <div style="font-size: 32px; margin-bottom: 8px;">💧</div>
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1772DA; font-size: 16px;">Reply "DAMP"</p>
                                                    <p style="margin: 0; font-size: 13px; color: #1772DA;">Soil still moist</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Step 2 -->
                    <tr>
                        <td style="padding: 0 40px 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width: 40px; height: 40px; background: #02B91A; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-weight: 700; font-size: 16px;">2</td>
                                                <td style="padding-left: 16px;">
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1C1C1C; font-size: 16px;">If DRY, we'll tell you to water</p>
                                                    <p style="margin: 0; font-size: 14px; color: #555555;">You'll get: <em>"Water me NOW! Reply DONE when finished"</em></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Step 3 -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FBF9; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width: 40px; height: 40px; background: #02B91A; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-weight: 700; font-size: 16px;">3</td>
                                                <td style="padding-left: 16px;">
                                                    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1C1C1C; font-size: 16px;">Reply DONE after watering</p>
                                                    <p style="margin: 0; font-size: 14px; color: #555555;">We'll reset the timer and check back at the perfect time!</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Call to Action -->
                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #18DA63 0%, #02B91A 100%); border-radius: 50px;">
                                <tr>
                                    <td style="padding: 16px 32px;">
                                        <p style="margin: 0; font-size: 16px; color: #ffffff; font-weight: 600;">
                                            Let's help ${plantName} thrive! 🌱
                                        </p>
                                    </td>
                                </tr>
                            </table>
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
                                    © 2025 LingoLeaf. If you didn't sign up, you can safely ignore this email.
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
}

async function sendTestEmail() {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not set in .env file');
    process.exit(1);
  }

  const testData = {
    species: 'Monstera Deliciosa',
    nickname: 'Monty',
    effectiveHours: 72,
    isDryStatus: false,
    twilioNumber: '+1 (555) 123-4567',
    slotIndex: 1
  };

  const html = createWelcomeEmailHtml(
    testData.species,
    testData.nickname,
    testData.effectiveHours,
    testData.isDryStatus,
    testData.twilioNumber,
    testData.slotIndex
  );

  try {
    console.log('📧 Sending test email to b@lingoleaf.ai...');
    
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LingoLeaf <noreply@lingoleaf.ai>',
        to: ['b@lingoleaf.ai'],
        subject: '🌱 Test: Welcome to LingoLeaf — Monty is registered!',
        html
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Resend API error: ${resp.status} ${text}`);
    }

    const json = await resp.json();
    console.log(`✅ Test email sent successfully! ID: ${json.id}`);
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
  }
}

sendTestEmail();
