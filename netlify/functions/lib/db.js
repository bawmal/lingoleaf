// netlify/functions/lib/db.js
const fetch = require('node-fetch');
const { DB_URL, DB_API_KEY } = process.env;

async function createPlant(row) {
  const res = await fetch(`${DB_URL}/rest/v1/plants`, {
    method: 'POST',
    headers: {
      'apikey': DB_API_KEY,
      'Authorization': `Bearer ${DB_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    const errorText = await res.text();
    let errorObj;
    try {
      errorObj = JSON.parse(errorText);
    } catch (e) {
      throw new Error(errorText);
    }
    // Preserve database error structure
    const error = new Error(errorObj.message || errorText);
    error.code = errorObj.code;
    error.details = errorObj.details;
    error.hint = errorObj.hint;
    throw error;
  }
  const [created] = await res.json();
  return created;
}

async function listDuePlants(nowTs) {
  const res = await fetch(`${DB_URL}/rest/v1/plants?next_due_ts=lte.${nowTs}`, {
    headers: { 'apikey': DB_API_KEY, 'Authorization': `Bearer ${DB_API_KEY}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getPlantByPhone(phone) {
  const res = await fetch(`${DB_URL}/rest/v1/plants?phone_e164=eq.${encodeURIComponent(phone)}&limit=1`, {
    headers: { 'apikey': DB_API_KEY, 'Authorization': `Bearer ${DB_API_KEY}` }
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

async function getPlantsByPhone(phone) {
  const res = await fetch(`${DB_URL}/rest/v1/plants?phone_e164=eq.${encodeURIComponent(phone)}&order=slot_index.asc`, {
    headers: { 'apikey': DB_API_KEY, 'Authorization': `Bearer ${DB_API_KEY}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getPlantByUserAndSlot(phone, twilioNumber) {
  const res = await fetch(`${DB_URL}/rest/v1/plants?phone_e164=eq.${encodeURIComponent(phone)}&twilio_number=eq.${encodeURIComponent(twilioNumber)}&limit=1`, {
    headers: { 'apikey': DB_API_KEY, 'Authorization': `Bearer ${DB_API_KEY}` }
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

async function updatePlant(id, patch) {
  const res = await fetch(`${DB_URL}/rest/v1/plants?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'apikey': DB_API_KEY,
      'Authorization': `Bearer ${DB_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows;
}

module.exports = { createPlant, listDuePlants, getPlantByPhone, getPlantsByPhone, getPlantByUserAndSlot, updatePlant };
