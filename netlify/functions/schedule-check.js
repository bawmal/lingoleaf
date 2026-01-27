// netlify/functions/schedule-check.js
const { listDuePlants, updatePlant, getPlantsByPhone } = require('./lib/db');
const { generateMessage, getSeason } = require('./lib/generateMessage');
const { nextDueFrom } = require('./lib/schedule');
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
    
    // Get user context for AI message generation
    const allUserPlants = await getPlantsByPhone(p.phone_e164);
    const daysSinceSignup = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
    const lastMessages = allUserPlants
      .filter(plant => plant.last_message_sent)
      .map(plant => plant.last_message_sent)
      .slice(-3); // Last 3 messages for context
    
    // Determine message type based on skip_soil_check flag
    const messageType = p.skip_soil_check ? 'watering_dry' : 'soil_check';
    
    // Build context for AI message generation
    const context = {
      plant: {
        species: p.species,
        nickname: p.nickname,
        personality: p.personality || 'formal',
        messages_sent: p.messages_sent || 0,
        last_message_at: p.last_message_at
      },
      user: {
        daysSinceSignup,
        messagesSent: p.messages_sent || 0,
        lastMessages
      },
      environment: {
        season: getSeason(p.lat || 0),
        hemisphere: (p.lat || 0) >= 0 ? 'Northern' : 'Southern',
        isIndoor: p.location !== 'outdoor'
      },
      request: {
        messageType,
        language: p.language || 'en'
      }
    };
    
    console.log(`   🤖 Generating ${messageType} message with AI...`);
    const result = await generateMessage(context);
    const body = result.message;
    
    console.log(`   ${result.success ? '✨ AI-generated' : '📋 Fallback template'} message`);
    
    // Clear the skip flag if it was set
    if (p.skip_soil_check) {
      await updatePlant(p.id, { skip_soil_check: false });
    }
    
    console.log(`   📱 Sending SMS: "${body.substring(0, 50)}..."`);
    
    try {
      const msg = await client.messages.create({ 
        to: p.phone_e164, 
        from: p.twilio_number || process.env.TWILIO_FROM_NUMBER,  // Use plant's slot number
        body 
      });
      
      // Store the sent message for context in future messages
      await updatePlant(p.id, { 
        last_message_sent: body,
        messages_sent: (p.messages_sent || 0) + 1
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

    // Schedule next watering based on plant's adjusted hours
    const next_due_ts = nextDueFrom(nowTs, p.adjusted_hours);
    await updatePlant(p.id, { next_due_ts });
    const daysUntilNext = (p.adjusted_hours / 24).toFixed(1);
    console.log(`   ⏰ Next watering scheduled in ${p.adjusted_hours} hours (~${daysUntilNext} days)`);
  }

  console.log(`✅ Schedule check complete. Processed ${due.length} plants.`);
  return { statusCode: 200, body: JSON.stringify({ processed: due.length }) };
};
