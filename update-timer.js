// update-timer.js
// Manually update a plant's next_due_ts to make it due now (for testing)

require('dotenv').config();
const fetch = require('node-fetch');

const DB_URL = process.env.DB_URL;
const DB_API_KEY = process.env.DB_API_KEY;

async function updateTimer(nickname) {
  console.log(`⏰ Updating timer for: ${nickname}\n`);

  try {
    // First, find the plant
    const findRes = await fetch(`${DB_URL}/rest/v1/plants?nickname=eq.${encodeURIComponent(nickname)}&select=*`, {
      headers: {
        'apikey': DB_API_KEY,
        'Authorization': `Bearer ${DB_API_KEY}`
      }
    });

    if (!findRes.ok) {
      throw new Error(`Query failed: ${findRes.status}`);
    }

    const plants = await findRes.json();

    if (plants.length === 0) {
      console.log(`❌ No plant found with nickname: ${nickname}`);
      return;
    }

    const plant = plants[0];
    
    console.log('📋 Current Status:');
    console.log('─────────────────────────────────────');
    console.log(`Plant: ${plant.nickname} (${plant.species})`);
    console.log(`Current next_due_ts: ${new Date(plant.next_due_ts).toLocaleString()}`);
    console.log('');

    // Update next_due_ts to NOW (make it due immediately)
    const now = Date.now();
    
    const updateRes = await fetch(`${DB_URL}/rest/v1/plants?id=eq.${encodeURIComponent(plant.id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': DB_API_KEY,
        'Authorization': `Bearer ${DB_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        next_due_ts: now
      })
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      throw new Error(`Update failed: ${updateRes.status} ${errorText}`);
    }

    const updated = await updateRes.json();
    
    console.log('✅ Timer Updated!');
    console.log('─────────────────────────────────────');
    console.log(`New next_due_ts: ${new Date(updated[0].next_due_ts).toLocaleString()}`);
    console.log(`Status: DUE NOW! 🚨`);
    console.log('');
    console.log('📱 Next Steps:');
    console.log('─────────────────────────────────────');
    console.log('1. Trigger the cron job to send reminder:');
    console.log('   curl -X POST https://lingoleaf.ai/.netlify/functions/schedule-check');
    console.log('');
    console.log('2. Or wait for the hourly cron job to run automatically');
    console.log('');
    console.log(`3. You should receive SMS: "Check my soil and reply: DRY or DAMP"`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get nickname from command line or use default
const nickname = process.argv[2] || 'Mama';
updateTimer(nickname);
