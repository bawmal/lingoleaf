// netlify/functions/sms-webhook.js
const { getPlantByUserAndSlot, updatePlant } = require('./lib/db');
const { confirmMessage, waterNowMessage, waitLongerMessage } = require('./lib/messaging');
const { computeAdjustedHours, nextDueFrom } = require('./lib/schedule');
const twilio = require('twilio');
const fetch = require('node-fetch');

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const params = new URLSearchParams(event.body || '');
  const userPhone = params.get('From');        // User's phone number
  const slotNumber = params.get('To');         // Which slot number received the message
  const body = (params.get('Body') || '').trim().toUpperCase();

  console.log(`📱 SMS received from ${userPhone} to slot ${slotNumber}: "${body}"`);

  // Find plant by user phone + slot number (unique combination)
  let plant = null;
  try { 
    plant = await getPlantByUserAndSlot(userPhone, slotNumber); 
  } catch (err) {
    console.error('Database error:', err.message);
  }

  const twiml = new twilio.twiml.MessagingResponse();

  if (!plant) {
    console.log(`❌ No plant found for user ${userPhone} at slot ${slotNumber}`);
    twiml.message('We could not find your plant profile. Reply HELP for assistance.');
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
  }

  console.log(`✅ Found plant: ${plant.nickname || plant.species} (${plant.id})`);


  // Get user's language preference
  const userLanguage = plant.language || 'en';

  // NEW FLOW: Handle soil check responses first
  // Support both English and French commands
  const isDry = body === 'DRY' || body === 'SEC';
  const isDamp = body === 'DAMP' || body === 'HUMIDE';
  const isDone = body === 'DONE' || body === 'FAIT';

  if (isDry) {
    // Soil is dry - tell user to water now
    twiml.message(waterNowMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species,
      language: userLanguage
    }));
    
    // Track DRY reply in Amplitude
    await trackAmplitudeEvent('SMS Reply - Dry', plant.email, {
      species: plant.species, nickname: plant.nickname,
      city: plant.city, country: plant.country
    });
    // No database update - wait for DONE reply
  } else if (isDamp) {
    // Soil is still moist - calculate smart next check time
    const now = Date.now();
    const { effective } = computeAdjustedHours({
      species: plant.species,
      pot_size: plant.pot_size,
      pot_material: plant.pot_material,
      light_exposure: plant.light_exposure,
      location: plant.location,
      zipcode: plant.zipcode,
      now: new Date()
    });
    
    // Calculate remaining time in schedule
    const totalInterval = effective * 3600000; // hours to milliseconds
    const timeElapsed = now - plant.last_watered_ts;
    const remainingTime = totalInterval - timeElapsed;
    
    // Next check at 60% of remaining time (weather-aware)
    // If remaining time is negative or very small, default to 50% of full interval
    const waitTime = remainingTime > 0 
      ? Math.floor(remainingTime * 0.6) 
      : Math.floor(totalInterval * 0.5);
    
    const next_due_ts = now + waitTime;
    
    // Mark that next message should skip soil check and just water
    await updatePlant(plant.id, { 
      next_due_ts,
      skip_soil_check: true  // Flag to skip check next time
    });
    
    console.log(`DAMP reply: Next check in ${Math.round(waitTime / 3600000)} hours (weather-aware)`);
    
    // Track DAMP reply in Amplitude
    await trackAmplitudeEvent('SMS Reply - Damp', plant.email, {
      species: plant.species, nickname: plant.nickname,
      city: plant.city, country: plant.country,
      next_check_hours: Math.round(waitTime / 3600000)
    });
    
    twiml.message(waitLongerMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species,
      language: userLanguage
    }));
  } else if (isDone) {
    // User finished watering - reset timer
    const now = Date.now();
    const { effective } = computeAdjustedHours({
      species: plant.species,
      pot_size: plant.pot_size,
      pot_material: plant.pot_material,
      light_exposure: plant.light_exposure,
      location: plant.location,
      now: new Date()
    });
    const next_due_ts = nextDueFrom(now, effective);
    
    // Reset timer and clear skip flag
    await updatePlant(plant.id, { 
      last_watered_ts: now, 
      next_due_ts,
      skip_soil_check: false  // Clear flag - next time do soil check
    });
    
    // Track DONE (watering completed) in Amplitude
    await trackAmplitudeEvent('SMS Reply - Watered', plant.email, {
      species: plant.species, nickname: plant.nickname,
      city: plant.city, country: plant.country,
      next_watering_hours: effective
    });
    
    twiml.message(confirmMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species,
      language: userLanguage
    }));
  } else {
    // Help message in user's language
    if (userLanguage === 'fr') {
      twiml.message('Répondez SEC si le sol est sec, HUMIDE si encore humide, ou FAIT après arrosage.');
    } else {
      twiml.message('Reply DRY if soil is dry, DAMP if still moist, or DONE after watering.');
    }
  }

  return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
};
