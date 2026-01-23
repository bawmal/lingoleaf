// netlify/functions/onboard.js
const { randomUUID } = require('crypto');
const { createPlant, getPlantsByPhone } = require('./lib/db');
const { computeAdjustedHours, nextDueFrom } = require('./lib/schedule');
const { getSlotNumber, MAX_PLANTS_PER_USER, MAX_PLANTS_LIFETIME } = require('./lib/twilio-pool');
const fetch = require('node-fetch');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

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

// Debug: Check if Twilio credentials are loaded
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ TWILIO CREDENTIALS MISSING!');
  console.error('Account SID exists:', !!accountSid);
  console.error('Auth Token exists:', !!authToken);
} else {
  console.log('✅ Twilio credentials loaded');
  console.log('Account SID starts with:', accountSid.substring(0, 6));
}

const client = twilio(accountSid, authToken);

function formatDuration(hours, language = 'en') {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (language === 'fr') {
    if (days === 0) return `${hours} heures`;
    if (remainingHours === 0) return `${days} ${days === 1 ? 'jour' : 'jours'}`;
    
    const halfDay = remainingHours >= 10 && remainingHours <= 14;
    return halfDay ? `${days} jours et demi` : `${days} ${days === 1 ? 'jour' : 'jours'}`;
  }
  
  if (days === 0) return `${hours} hours`;
  if (remainingHours === 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
  
  const halfDay = remainingHours >= 10 && remainingHours <= 14;
  return halfDay ? `${days} and a half days` : `${days} ${days === 1 ? 'day' : 'days'}`;
}

function createWelcomeMessage(species, nickname, effectiveHours, language = 'en') {
  const plantName = nickname || species;
  const duration = formatDuration(effectiveHours, language);
  
  if (language === 'fr') {
    return `Excellente nouvelle! Votre ${species}${nickname ? `, ${nickname},` : ''} a été enregistré avec succès! 🎉

Vous pouvez vous attendre à votre premier rappel d'arrosage pour ${plantName} dans environ ${duration}. Lorsque vous recevrez un rappel, répondez simplement par FAIT une fois que vous avez arrosé.

Pour m'aider à affiner le programme de ${plantName}, vous pouvez aussi répondre par SEC si le sol semble inhabituellement sec, ou HUMIDE s'il est encore assez mouillé.

Travaillons ensemble pour aider ${plantName} à s'épanouir! 🌱`;
  }
  
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
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'DM Sans', Arial, sans-serif; background-color: #F0F7F1;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F7F1;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: #E7F5EC; padding: 50px 40px;">
                            <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="background: #ffffff; width: 50px; height: 50px; border-radius: 14px; text-align: center; vertical-align: middle;">
                                        <span style="font-size: 28px;">🌱</span>
                                    </td>
                                    <td style="padding-left: 12px;">
                                        <span style="font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; color: #0f4c3a;">LingoLeaf</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin: 30px 0 10px 0; color: #0f4c3a; font-size: 32px; font-weight: 700;">Welcome to LingoLeaf! 🎉</h1>
                            <p style="margin: 0; color: #2d5016; font-size: 16px;">Your plant now has a voice</p>
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

  const { email, phone, zipcode, city, country, species, nickname, personality, pot_size, pot_material, light_exposure, location, initial_soil_status, language } = data;

  // Default language to English if not provided
  const userLanguage = language || 'en';

  // Check how many plants this user already has
  const existingPlants = await getPlantsByPhone(phone);
  const slotIndex = existingPlants.length;
  
  // Check if user has lifetime deal
  let isLifetimeUser = false;
  let maxPlants = MAX_PLANTS_PER_USER;
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: lifetimeUser } = await supabase
      .from('lifetime_users')
      .select('max_plants')
      .eq('phone_e164', phone)
      .single();
    
    if (lifetimeUser) {
      isLifetimeUser = true;
      maxPlants = lifetimeUser.max_plants || MAX_PLANTS_LIFETIME;
      console.log(`✅ Lifetime user detected: ${phone} (max ${maxPlants} plants)`);
    }
  } catch (err) {
    console.log('Lifetime check skipped:', err.message);
  }
  
  // Check if user has reached the limit
  if (slotIndex >= maxPlants) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: `Maximum ${maxPlants} plants per user. You already have ${existingPlants.length} plants registered.` 
      })
    };
  }
  
  // Assign Twilio number from pool
  const twilioNumber = getSlotNumber(slotIndex, isLifetimeUser);
  console.log(`Assigning plant to slot ${slotIndex + 1}: ${twilioNumber} (lifetime: ${isLifetimeUser})`);

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
    // Don't apply winter multiplier to first watering (only subsequent waterings)
    next_due_ts = nextDueFrom(lastWateredTs, sched.adjusted);
  } else if (initial_soil_status === 'damp') {
    // Half interval - soil is moist, check in ~50% of normal time
    // Don't apply winter multiplier to first watering
    next_due_ts = nextDueFrom(lastWateredTs, Math.floor(sched.adjusted * 0.5));
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
      skip_soil_check: false, language: userLanguage
    });
    
    // Track successful plant registration in Amplitude
    await trackAmplitudeEvent('B2C Plant Registration', email, {
      species, nickname, personality, pot_size, pot_material, light_exposure,
      city, country, adjusted_hours: sched.adjusted
    });
  } catch (error) {
    console.log('ERROR CAUGHT:', error.code, error.message);  // ADD THIS LINE
    // Handle duplicate phone number error
    // Handle duplicate phone number error
    if (error.code === '23505' && error.message.includes('unique_user_slot')) {
      // Recount plants since existingPlants might be stale
      const currentPlants = await getPlantsByPhone(phone);
      const plantCount = currentPlants.length;
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
    if (userLanguage === 'fr') {
      welcomeMessage = `🚨 ${nickname || species} a besoin d'eau MAINTENANT! Votre sol est sec. Arrosez votre plante, puis répondez FAIT pour commencer votre programme de soins. 🌱`;
    } else {
      welcomeMessage = `🚨 ${nickname || species} needs water NOW! Your soil is dry. Water your plant, then reply DONE to start your care schedule. 🌱`;
    }
  } else {
    // Normal welcome message
    welcomeMessage = createWelcomeMessage(species, nickname, sched.adjusted, userLanguage);
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
    headers: { Location: `/success.html?phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}` },
    body: ''
  };
};
