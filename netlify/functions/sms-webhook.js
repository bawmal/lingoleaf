// netlify/functions/sms-webhook.js
const { getPlantByPhone, updatePlant } = require('./lib/db');
const { confirmMessage, calibrationPrompt } = require('./lib/messaging');
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

  if (body === 'DONE') {
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
    twiml.message(`${confirmMessage({ personality: plant.personality, nickname: plant.nickname, species: plant.species })} ${calibrationPrompt()}`);
  } else if (body === 'DRY' || body === 'DAMP') {
    const calibrationDelta = (body === 'DRY') ? +6 : -4; // hours
    const newCal = (plant.calibration_hours || 0) + calibrationDelta;
    await updatePlant(plant.id, { calibration_hours: newCal });
    twiml.message(`Noted. Adjusting schedule by ${calibrationDelta}h for ${plant.nickname || plant.species}.`);
  } else {
    twiml.message('Reply DONE after watering, or DRY/DAMP for calibration.');
  }

  return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
};
