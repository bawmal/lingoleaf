// netlify/functions/schedule-check.js
const { listDuePlants, updatePlant } = require('./lib/db');
const { personaMessage, waterNowMessage } = require('./lib/messaging');
const fetch = require('node-fetch');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.handler = async () => {
  const nowTs = Date.now();
  console.log(`🔍 Checking for plants due at timestamp: ${nowTs}`);
  
  const due = await listDuePlants(nowTs);
  console.log(`📊 Found ${due.length} plants due for watering`);
  
  const units = process.env.OWM_UNITS || 'metric'; // 'metric' or 'imperial'

  for (const p of due) {
    console.log(`🌱 Processing plant: ${p.nickname || p.species} (${p.id})`);
    console.log(`   Phone: ${p.phone_e164}, Personality: ${p.personality}`);
    console.log(`   Skip soil check: ${p.skip_soil_check || false}`);
    
    let body;
    
    // Check if we should skip soil check (after DAMP reply)
    if (p.skip_soil_check) {
      // Skip soil check - just tell user to water
      console.log(`   🚰 Skipping soil check - sending direct water message`);
      body = waterNowMessage({ 
        personality: p.personality, 
        nickname: p.nickname, 
        species: p.species 
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
      
      body = personaMessage({ personality: p.personality, nickname: p.nickname, species: p.species, temp, condition, units });
    }
    
    console.log(`   📱 Sending SMS: "${body.substring(0, 50)}..."`);
    
    try {
      const msg = await client.messages.create({ to: p.phone_e164, from: process.env.TWILIO_FROM_NUMBER, body });
      console.log(`   ✅ SMS sent successfully! SID: ${msg.sid}`);
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
