// netlify/functions/onboard.js
const { randomUUID } = require('crypto');
const { createPlant, getPlantsByPhone } = require('./lib/db');
const { computeAdjustedHours, nextDueFrom } = require('./lib/schedule');
const { getSlotNumber, MAX_PLANTS_PER_USER } = require('./lib/twilio-pool');
const fetch = require('node-fetch');
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
              
              ${twilioNumber ? `
              <div style="background-color: #e8f4e8; padding: 20px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                  📞 Save This Number
                </p>
                <p style="margin: 0 0 10px 0; color: #2d5016; font-size: 24px; font-weight: bold;">
                  ${twilioNumber}
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 14px;">
                  This is <strong>${plantName}'s</strong> personal number (Plant ${slotIndex}). Save it as "${plantName} Plant" in your contacts!
                </p>
              </div>
              ` : ''}
              
              <div style="background-color: #f9f9f5; padding: 30px; margin-bottom: 40px; border-left: 4px solid #7ba05b;">
                <p style="margin: 0 0 10px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                  ${isDryStatus ? '🚨 Immediate Text Message Sent!' : 'Your First Watering Reminder'}
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.7;">
                  ${isDryStatus 
                    ? `We've sent you an <strong>immediate text message</strong> because your soil is dry. Please water <strong>${plantName}</strong> right away and reply <strong>DONE</strong> to start your care schedule!`
                    : `Expect a friendly reminder for <strong>${plantName}</strong> in about <strong>${duration}</strong>. We'll send you a text message asking you to check the soil!`
                  }
                </p>
              </div>
              
              <h2 style="margin: 0 0 25px 0; color: #2d5016; font-size: 24px; font-weight: normal; text-align: center;">
                How LingoLeaf Works
              </h2>
              
              <div style="background-color: #f0f8ff; padding: 25px; margin-bottom: 20px; border-radius: 8px;">
                <p style="margin: 0 0 15px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                  📱 Step 1: We'll ask you to check the soil
                </p>
                <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                  When it's time, you'll get a text: <em>"Check my soil and reply: DRY or DAMP"</em>
                </p>
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                  <tr>
                    <td style="width: 48%; padding: 15px; background-color: #fff8e8; text-align: center; vertical-align: top; border-radius: 6px;">
                      <p style="margin: 0 0 8px 0; font-size: 20px;">🏜️</p>
                      <p style="margin: 0 0 8px 0; color: #2d5016; font-size: 15px; font-weight: bold;">
                        Reply "DRY"
                      </p>
                      <p style="margin: 0; color: #4a4a4a; font-size: 13px;">
                        Soil needs water
                      </p>
                    </td>
                    <td style="width: 4%;"></td>
                    <td style="width: 48%; padding: 15px; background-color: #e8f0f8; text-align: center; vertical-align: top; border-radius: 6px;">
                      <p style="margin: 0 0 8px 0; font-size: 20px;">💦</p>
                      <p style="margin: 0 0 8px 0; color: #2d5016; font-size: 15px; font-weight: bold;">
                        Reply "DAMP"
                      </p>
                      <p style="margin: 0; color: #4a4a4a; font-size: 13px;">
                        Soil still moist
                      </p>
                    </td>
                  </tr>
                </table>
                
                <p style="margin: 0 0 15px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                  💧 Step 2: If DRY, we'll tell you to water
                </p>
                <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                  You'll get: <em>"Water me NOW! Reply DONE when finished"</em>
                </p>
                
                <p style="margin: 0 0 15px 0; color: #2d5016; font-size: 16px; font-weight: bold;">
                  ✅ Step 3: Reply DONE after watering
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                  We'll reset the timer and check back at the perfect time!
                </p>
              </div>
              
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

async function sendWelcomeEmail({ to, species, nickname, effectiveHours, isDryStatus = false, twilioNumber = null, slotIndex = 1 }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set; skipping welcome email.');
    return { skipped: true };
  }
  try {
    const subject = `Welcome to LingoLeaf — ${nickname || species} is registered!`;
    const html = createWelcomeEmailHtml(species, nickname, effectiveHours, isDryStatus, twilioNumber, slotIndex);
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

  const { email, phone, zipcode, city, country, species, nickname, personality, pot_size, pot_material, light_exposure, location, initial_soil_status } = data;

  // Check how many plants this user already has
  const existingPlants = await getPlantsByPhone(phone);
  const slotIndex = existingPlants.length;
  
  // Check if user has reached the limit
  if (slotIndex >= MAX_PLANTS_PER_USER) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: `Maximum ${MAX_PLANTS_PER_USER} plants per user. You already have ${existingPlants.length} plants registered.` 
      })
    };
  }
  
  // Assign Twilio number from pool
  const twilioNumber = getSlotNumber(slotIndex);
  console.log(`Assigning plant to slot ${slotIndex + 1}: ${twilioNumber}`);

  // Geocode via OWM - try zipcode first for precision, fallback to city
  const owmKey = process.env.OWM_API_KEY;
  let lat = null, lon = null;
  try {
    // Try zipcode first (more precise)
    if (zipcode) {
      const geoZip = await (await fetch(`https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(zipcode)},${encodeURIComponent(country)}&appid=${owmKey}`)).json();
      if (geoZip?.lat && geoZip?.lon) {
        lat = geoZip.lat;
        lon = geoZip.lon;
        console.log(`✅ Geocoded via zipcode: ${zipcode} → ${lat}, ${lon}`);
      }
    }
    
    // Fallback to city if zipcode failed
    if (!lat || !lon) {
      const geoCity = await (await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},${encodeURIComponent(country)}&limit=1&appid=${owmKey}`)).json();
      lat = geoCity?.[0]?.lat ?? null;
      lon = geoCity?.[0]?.lon ?? null;
      console.log(`✅ Geocoded via city: ${city}, ${country} → ${lat}, ${lon}`);
    }
  } catch (err) {
    console.error('Geocoding error:', err.message);
  }

  const sched = computeAdjustedHours({ species, pot_size, pot_material, light_exposure });
  const lastWateredTs = Date.now();
  
  // Calculate next_due_ts based on initial soil status
  let next_due_ts;
  let shouldSendImmediateReminder = false;
  
  if (initial_soil_status === 'just_watered') {
    // Full interval - just watered, so wait the complete duration
    next_due_ts = nextDueFrom(lastWateredTs, sched.effective);
  } else if (initial_soil_status === 'damp') {
    // Half interval - soil is moist, check in ~50% of normal time
    next_due_ts = nextDueFrom(lastWateredTs, Math.floor(sched.effective * 0.5));
  } else if (initial_soil_status === 'dry') {
    // IMMEDIATE - soil is dry NOW, send reminder right away
    // Set next_due_ts to now so it triggers immediately
    next_due_ts = Date.now();
    shouldSendImmediateReminder = true;
  } else {
    // Default fallback (if field not provided)
    next_due_ts = nextDueFrom(lastWateredTs, sched.effective);
  }

  let row;
  try {
    row = await createPlant({
      id: randomUUID(), created_at: new Date().toISOString(),
      email, phone_e164: phone, zipcode, city, country, lat, lon, species, nickname, personality,
      pot_size, pot_material, light_exposure,
      twilio_number: twilioNumber, slot_index: slotIndex,
      base_hours: sched.base, winter_multiplier: sched.winter, adjusted_hours: sched.adjusted,
      calibration_hours: 0, last_watered_ts: lastWateredTs, next_due_ts, timezone: 'America/Toronto',
      skip_soil_check: false
    });
  } catch (error) {
    // Handle duplicate phone number error
    if (error.code === '23505' && error.message.includes('unique_user_slot')) {
      const plantCount = existingPlants.length;
      const remaining = MAX_PLANTS_PER_USER - plantCount;
      
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phone Number Already Registered - LingoLeaf</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #e8f4e8 0%, #f5f5f0 100%);
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            text-align: center;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #2d5016;
            margin: 0 0 20px 0;
            font-size: 28px;
        }
        p {
            color: #4a4a4a;
            line-height: 1.6;
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .stats {
            background: #e8f4e8;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
        }
        .stats strong {
            color: #2d5016;
            font-size: 24px;
            display: block;
            margin-bottom: 5px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #7ba05b 0%, #2d5016 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .secondary-button {
            display: inline-block;
            color: #7ba05b;
            padding: 15px 30px;
            text-decoration: none;
            margin-top: 10px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🌱</div>
        <h1>Phone Number Already Registered</h1>
        <p>This phone number already has <strong>${plantCount} plant${plantCount === 1 ? '' : 's'}</strong> registered with LingoLeaf.</p>
        
        <div class="stats">
            <strong>${plantCount} / ${MAX_PLANTS_PER_USER}</strong>
            <p style="margin: 0; color: #2d5016; font-weight: 600;">Plants Registered</p>
        </div>
        
        ${remaining > 0 ? `
        <p style="color: #7ba05b; font-weight: 600;">✅ You can register ${remaining} more plant${remaining === 1 ? '' : 's'}!</p>
        <a href="/#signup" class="button">Add Another Plant 🌿</a>
        ` : `
        <p style="color: #d97706; font-weight: 600;">⚠️ You've reached the maximum of ${MAX_PLANTS_PER_USER} plants per phone number.</p>
        `}
        
        <br>
        <a href="/" class="secondary-button">← Back to Home</a>
    </div>
</body>
</html>
        `
      };
    }
    
    // Re-throw other errors
    throw error;
  }

  // Send welcome SMS (or immediate watering reminder if soil is dry)
  let welcomeMessage;
  
  if (shouldSendImmediateReminder) {
    // Soil is DRY - send immediate watering reminder instead of welcome
    welcomeMessage = `🚨 ${nickname || species} needs water NOW! Your soil is dry. Water your plant, then reply DONE to start your care schedule. 🌱`;
  } else {
    // Normal welcome message
    welcomeMessage = createWelcomeMessage(species, nickname, sched.effective);
  }
  
  try {
    console.log(`Sending ${shouldSendImmediateReminder ? 'immediate watering reminder' : 'welcome SMS'} to ${phone} from slot ${slotIndex + 1}...`);
    const message = await client.messages.create({
      to: phone,
      from: twilioNumber,  // Send FROM the plant's assigned slot number
      body: welcomeMessage
    });
    console.log(`✅ SMS sent successfully! SID: ${message.sid}`);
  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    console.error('Error details:', error);
  }

  // Send welcome email (Resend)
  if (email) {
    await sendWelcomeEmail({ 
      to: email, 
      species, 
      nickname, 
      effectiveHours: sched.effective,
      isDryStatus: shouldSendImmediateReminder,
      twilioNumber,
      slotIndex: slotIndex + 1,  // 1-indexed for display
      totalPlants: slotIndex + 1
    });
  }

  return {
    statusCode: 302,
    headers: { Location: '/success.html' },
    body: ''
  };
};
