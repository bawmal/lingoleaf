// netlify/functions/sms-webhook.js
const { getPlantByUserAndSlot, updatePlant } = require('./lib/db');
const { confirmMessage, waterNowMessage, waitLongerMessage } = require('./lib/messaging');
const { computeAdjustedHours, nextDueFrom } = require('./lib/schedule');
const twilio = require('twilio');

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


  // NEW FLOW: Handle soil check responses first
  if (body === 'DRY') {
    // Soil is dry - tell user to water now
    twiml.message(waterNowMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species 
    }));
    // No database update - wait for DONE reply
  } else if (body === 'DAMP') {
    // Soil is still moist - calculate smart next check time
    const now = Date.now();
    const { adjusted } = computeAdjustedHours({
      species: plant.species,
      pot_size: plant.pot_size,
      pot_material: plant.pot_material,
      light_exposure: plant.light_exposure,
      now: new Date()
    });
    
    // Calculate remaining time in schedule
    const totalInterval = adjusted * 3600000; // hours to milliseconds
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
    
    twiml.message(waitLongerMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species 
    }));
  } else if (body === 'DONE') {
    // User finished watering - reset timer
    const now = Date.now();
    const { adjusted } = computeAdjustedHours({
      species: plant.species,
      pot_size: plant.pot_size,
      pot_material: plant.pot_material,
      light_exposure: plant.light_exposure,
      now: new Date()
    });
    const next_due_ts = nextDueFrom(now, adjusted);
    
    // Reset timer and clear skip flag
    await updatePlant(plant.id, { 
      last_watered_ts: now, 
      next_due_ts,
      skip_soil_check: false  // Clear flag - next time do soil check
    });
    
    twiml.message(confirmMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species 
    }));
  } else {
    twiml.message('Reply DRY if soil is dry, DAMP if still moist, or DONE after watering.');
  }

  return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
};
