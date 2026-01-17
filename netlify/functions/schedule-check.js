// netlify/functions/schedule-check.js
const { listDuePlants, updatePlant } = require('./lib/db');
const { personaMessage, waterNowMessage } = require('./lib/messaging');
const fetch = require('node-fetch');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

// Helper: Determine temperature units based on country
// US, US territories, Liberia, Myanmar use Fahrenheit; rest of world uses Celsius
function getUnitsForCountry(country) {
  const imperialCountries = ['US', 'USA', 'United States', 'Liberia', 'Myanmar', 'Burma'];
  const countryUpper = (country || '').toUpperCase();
  return imperialCountries.some(c => countryUpper.includes(c.toUpperCase())) ? 'imperial' : 'metric';
}

exports.handler = async (event) => {
  // Log invocation source for debugging
  const source = event?.httpMethod ? 'HTTP' : 'SCHEDULED';
  console.log(`🚀 Schedule check triggered via: ${source}`);
  console.log(`⏰ Execution time: ${new Date().toISOString()}`);
  const nowTs = Date.now();
  console.log(`🔍 Checking for plants due at timestamp: ${nowTs}`);
  
  const due = await listDuePlants(nowTs);
  console.log(`📊 Found ${due.length} plants due for watering`);

  for (const p of due) {
    console.log(`🌱 Processing plant: ${p.nickname || p.species} (${p.id})`);
    console.log(`   Phone: ${p.phone_e164}, Personality: ${p.personality}`);
    console.log(`   Country: ${p.country || 'Unknown'}`);
    console.log(`   Skip soil check: ${p.skip_soil_check || false}`);
    
    // Determine temperature units based on plant's country
    const units = getUnitsForCountry(p.country);
    console.log(`   Units: ${units === 'imperial' ? 'Fahrenheit' : 'Celsius'}`);
    
    let body;
    
    // Check if we should skip soil check (after DAMP reply)
    if (p.skip_soil_check) {
      // Skip soil check - just tell user to water
      console.log(`   🚰 Skipping soil check - sending direct water message`);
      body = waterNowMessage({ 
        personality: p.personality, 
        nickname: p.nickname, 
        species: p.species,
        language: p.language || 'en'
      });
      
      // Clear the skip flag after using it
      await updatePlant(p.id, { skip_soil_check: false });
    } else {
      // Normal flow - ask user to check soil first
      let temp = null, condition = 'Fair';
      if (p.lat && p.lon) {
        try {
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${p.lat}&lon=${p.lon}&appid=${process.env.OWM_API_KEY}&units=${units}`;
          const w = await (await fetch(url)).json();
          temp = w?.main?.temp ?? temp;
          condition = w?.weather?.[0]?.main ?? condition;
          console.log(`   Weather: ${temp}°${units === 'metric' ? 'C' : 'F'}, ${condition}`);
        } catch (err) {
          console.log(`   ⚠️ Weather fetch failed:`, err.message);
        }
      }
      
      body = await personaMessage({ personality: p.personality, nickname: p.nickname, species: p.species, temp, condition, units, language: p.language || 'en' });
    }
    
    console.log(`   📱 Sending SMS: "${body.substring(0, 50)}..."`);
    
    try {
      const msg = await client.messages.create({ 
        to: p.phone_e164, 
        from: p.twilio_number || process.env.TWILIO_FROM_NUMBER,  // Use plant's slot number
        body 
      });
      console.log(`   ✅ SMS sent successfully from slot ${p.slot_index + 1}! SID: ${msg.sid}`);
      
      // Track SMS sent in Amplitude
      await trackAmplitudeEvent('SMS Reminder Sent', p.email, {
        species: p.species,
        nickname: p.nickname,
        personality: p.personality,
        city: p.city,
        country: p.country,
        message_type: p.skip_soil_check ? 'water_now' : 'soil_check'
      });
    } catch (err) {
      console.error(`   ❌ SMS failed:`, err.message);
    }

    // Avoid spamming: push next_due_ts ahead 1 hour after alert
    await updatePlant(p.id, { next_due_ts: nowTs + 60*60*1000 });
    console.log(`   ⏰ Updated next_due_ts to +1 hour`);
  }

  console.log(`✅ Schedule check complete. Processed ${due.length} plants.`);
  return { statusCode: 200, body: JSON.stringify({ processed: due.length }) };
};
