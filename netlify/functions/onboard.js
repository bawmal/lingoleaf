// netlify/functions/onboard.js
const { computeAdjustedHours, nextDueFrom } = require('./lib/schedule');
const { createPlant } = require('./lib/db');
const fetch = require('node-fetch');
const { randomUUID } = require('crypto');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function formatDuration(hours) {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days === 0) return `${hours} hours`;
  if (remainingHours === 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
  
  const halfDay = remainingHours >= 10 && remainingHours <= 14;
  return halfDay ? `${days} and a half days` : `${days} ${days === 1 ? 'day' : 'days'}`;
}

function createWelcomeMessage(species, nickname, effectiveHours) {
  const plantName = nickname || species;
  const duration = formatDuration(effectiveHours);
  
  return `Great news! Your ${species}${nickname ? `, ${nickname},` : ''} has been successfully registered! 🎉

You can expect your first watering reminder for ${plantName} in about ${duration}. When you get a reminder, just reply with DONE once you've watered.

To help me fine-tune ${plantName}'s schedule, you can also reply with DRY if the soil feels unexpectedly dry, or DAMP if it's still quite wet.

Let's work together to help ${plantName} thrive! 🌱`;
}

function createWelcomeEmailHtml(species, nickname, effectiveHours) {
  const plantName = nickname || species;
  const duration = formatDuration(effectiveHours);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LingoLeaf</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f0;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f0;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Hero Image / Header -->
          <tr>
            <td style="background-color: #e8f4e8; padding: 60px 40px; text-align: center;">
              <div style="font-size: 80px; line-height: 1; margin-bottom: 20px;">🌿</div>
              <h1 style="margin: 0; color: #2d5016; font-size: 36px; font-weight: normal; letter-spacing: 1px;">
                Meet Your Plant's New Voice
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 18px; line-height: 1.8; text-align: center;">
                🎉 Great news! Your <strong>${species}</strong>${nickname ? ` (${nickname})` : ''} has been successfully registered!
              </p>
              
              <div style="background-color: #f9f9f5; padding: 30px; margin-bottom: 40px; border-left: 4px solid #7ba05b;">
                <p style="margin: 0 0 10px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                  Your First Watering Reminder
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.7;">
                  Expect a friendly reminder for <strong>${plantName}</strong> in about <strong>${duration}</strong>. We'll send you a text message when it's time!
                </p>
              </div>
              
              <h2 style="margin: 0 0 25px 0; color: #2d5016; font-size: 24px; font-weight: normal; text-align: center;">
                How to Respond
              </h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px; background-color: #e8f4e8; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #2d5016; font-size: 20px;">💧</p>
                    <p style="margin: 0 0 8px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                      Reply "DONE"
                    </p>
                    <p style="margin: 0; color: #4a4a4a; font-size: 14px;">
                      Once you've watered ${plantName}
                    </p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 48%; padding: 20px; background-color: #fff8e8; text-align: center; vertical-align: top;">
                    <p style="margin: 0 0 8px 0; font-size: 20px;">🏜️</p>
                    <p style="margin: 0 0 8px 0; color: #2d5016; font-size: 15px; font-weight: bold;">
                      Reply "DRY"
                    </p>
                    <p style="margin: 0; color: #4a4a4a; font-size: 13px;">
                      If soil is unexpectedly dry
                    </p>
                  </td>
                  <td style="width: 4%;"></td>
                  <td style="width: 48%; padding: 20px; background-color: #e8f0f8; text-align: center; vertical-align: top;">
                    <p style="margin: 0 0 8px 0; font-size: 20px;">💦</p>
                    <p style="margin: 0 0 8px 0; color: #2d5016; font-size: 15px; font-weight: bold;">
                      Reply "DAMP"
                    </p>
                    <p style="margin: 0; color: #4a4a4a; font-size: 13px;">
                      If soil is still quite wet
                    </p>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center; margin: 40px 0 30px 0; padding: 30px; background-color: #f9f9f5;">
                <p style="margin: 0; color: #2d5016; font-size: 18px; line-height: 1.6;">
                  Let's work together to help ${plantName} thrive! 🌱
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #2d5016; padding: 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                LingoLeaf
              </p>
              <p style="margin: 0 0 20px 0; color: #b8d4a8; font-size: 14px; font-style: italic;">
                Your Plants, With a Voice
              </p>
              <p style="margin: 0; color: #b8d4a8; font-size: 12px; line-height: 1.6;">
                If you didn't sign up for LingoLeaf, you can safely ignore this email.
              </p>
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

async function sendWelcomeEmail({ to, species, nickname, effectiveHours }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set; skipping welcome email.');
    return { skipped: true };
  }
  try {
    const subject = `Welcome to LingoLeaf — ${nickname || species} is registered!`;
    const html = createWelcomeEmailHtml(species, nickname, effectiveHours);
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LingoLeaf <noreply@lingoleaf.ai>',
        to: [to],
        subject,
        html
      })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Resend API error: ${resp.status} ${text}`);
    }
    const json = await resp.json();
    console.log(`✅ Welcome email queued via Resend. Id: ${json.id}`);
    return { ok: true, id: json.id };
  } catch (err) {
    console.error('❌ Failed to send welcome email:', err.message);
    return { ok: false, error: err.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  let data = {};
  if (contentType.includes('application/json')) {
    data = JSON.parse(event.body || '{}');
  } else {
    data = Object.fromEntries(new URLSearchParams(event.body || ''));
  }

  const { email, phone, city, country, species, nickname, personality, pot_size, pot_material, light_exposure } = data;

  // Geocode via OWM direct geocoding
  const owmKey = process.env.OWM_API_KEY;
  let lat = null, lon = null;
  try {
    const geo = await (await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},${encodeURIComponent(country)}&limit=1&appid=${owmKey}`)).json();
    lat = geo?.[0]?.lat ?? null;
    lon = geo?.[0]?.lon ?? null;
  } catch {}

  const sched = computeAdjustedHours({ species, pot_size, pot_material, light_exposure });
  const lastWateredTs = Date.now();
  const next_due_ts = nextDueFrom(lastWateredTs, sched.effective);

  const row = await createPlant({
    id: randomUUID(), created_at: new Date().toISOString(),
    email, phone_e164: phone, city, country, lat, lon, species, nickname, personality,
    pot_size, pot_material, light_exposure,
    base_hours: sched.base, winter_multiplier: sched.winter, adjusted_hours: sched.adjusted,
    calibration_hours: 0, last_watered_ts: lastWateredTs, next_due_ts, timezone: 'America/Toronto'
  });

  // Send welcome SMS
  const welcomeMessage = createWelcomeMessage(species, nickname, sched.effective);
  try {
    console.log(`Sending welcome SMS to ${phone}...`);
    const message = await client.messages.create({
      to: phone,
      from: process.env.TWILIO_FROM_NUMBER,
      body: welcomeMessage
    });
    console.log(`✅ Welcome SMS sent successfully! SID: ${message.sid}`);
  } catch (error) {
    console.error('❌ Failed to send welcome SMS:', error.message);
    console.error('Error details:', error);
  }

  // Send welcome email (Resend)
  if (email) {
    await sendWelcomeEmail({ to: email, species, nickname, effectiveHours: sched.effective });
  }

  return {
    statusCode: 302,
    headers: { Location: '/success.html' },
    body: ''
  };
};
