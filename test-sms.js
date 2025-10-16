// Test script to trigger SMS reminder
// This will:
// 1. Find your most recent plant
// 2. Set next_due_ts to NOW (making it due for watering)
// 3. Trigger the schedule-check function

const DB_URL = process.env.DB_URL;
const DB_API_KEY = process.env.DB_API_KEY;

async function triggerTest() {
  console.log('🌱 LingoLeaf SMS Test\n');
  
  // 1. Get the most recent plant
  console.log('1️⃣ Fetching your plant...');
  const plantsRes = await fetch(`${DB_URL}/rest/v1/plants?select=*&order=created_at.desc&limit=1`, {
    headers: {
      'apikey': DB_API_KEY,
      'Authorization': `Bearer ${DB_API_KEY}`
    }
  });
  
  const plants = await plantsRes.json();
  
  if (!plants || plants.length === 0) {
    console.log('❌ No plants found. Please register a plant first at https://lingoleaf.ai');
    return;
  }
  
  const plant = plants[0];
  console.log(`✅ Found plant: ${plant.nickname || plant.species}`);
  console.log(`   Phone: ${plant.phone_e164}`);
  console.log(`   Personality: ${plant.personality}`);
  console.log(`   Location: ${plant.city}, ${plant.country}\n`);
  
  // 2. Update next_due_ts to NOW
  console.log('2️⃣ Setting plant as due for watering NOW...');
  const nowMs = Date.now();
  
  const updateRes = await fetch(`${DB_URL}/rest/v1/plants?id=eq.${plant.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': DB_API_KEY,
      'Authorization': `Bearer ${DB_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      next_due_ts: nowMs
    })
  });
  
  if (!updateRes.ok) {
    console.log('❌ Failed to update plant');
    return;
  }
  
  console.log(`✅ Plant is now due for watering!\n`);
  
  // 3. Trigger the schedule-check function
  console.log('3️⃣ Triggering SMS reminder...');
  console.log('   (This will send an SMS to your phone)\n');
  
  const scheduleRes = await fetch('https://lingoleaf.ai/.netlify/functions/schedule-check', {
    method: 'POST'
  });
  
  const result = await scheduleRes.text();
  console.log('📱 Function response:', result);
  
  console.log('\n✅ Test complete!');
  console.log('   Check your phone for the SMS reminder.');
  console.log('   Reply "DONE" to test the response flow.\n');
}

triggerTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
