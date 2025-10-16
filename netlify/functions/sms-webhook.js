// netlify/functions/sms-webhook.js
const { getPlantByPhone, updatePlant } = require('./lib/db');
const { confirmMessage, waterNowMessage, waitLongerMessage } = require('./lib/messaging');
const { computeAdjustedHours, nextDueFrom } = require('./lib/schedule');
const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const params = new URLSearchParams(event.body || '');
  const from = params.get('From');
  const body = (params.get('Body') || '').trim().toUpperCase();

  let plant = null;
  try { plant = await getPlantByPhone(from); } catch {}

  const twiml = new twilio.twiml.MessagingResponse();

  if (!plant) {
    twiml.message('We could not find your plant profile. Reply HELP for assistance.');
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
  }

  // NEW FLOW: Handle soil check responses first
  if (body === 'DRY') {
    // Soil is dry - tell user to water now
    twiml.message(waterNowMessage({ 
      personality: plant.personality, 
      nickname: plant.nickname, 
      species: plant.species 
    }));
    // No calibration needed - timing was perfect
  } else if (body === 'DAMP') {
    // Soil is still moist - wait longer, adjust schedule
    const now = Date.now();
    const { adjusted } = computeAdjustedHours({
      species: plant.species,
      pot_size: plant.pot_size,
      pot_material: plant.pot_material,
      light_exposure: plant.light_exposure,
      now: new Date()
    });
    // Add 12 hours to next check (reminder was too early)
    const next_due_ts = nextDueFrom(now, 12);
    await updatePlant(plant.id, { next_due_ts });
    
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
    await updatePlant(plant.id, { last_watered_ts: now, next_due_ts });
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
