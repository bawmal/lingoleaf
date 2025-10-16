// check-plant.js
// Check plant details and next watering schedule

require('dotenv').config();
const fetch = require('node-fetch');

const DB_URL = process.env.DB_URL;
const DB_API_KEY = process.env.DB_API_KEY;

async function checkPlant(nickname) {
  console.log(`🔍 Looking for plant: ${nickname}\n`);

  try {
    // Query for the plant
    const res = await fetch(`${DB_URL}/rest/v1/plants?nickname=eq.${encodeURIComponent(nickname)}&select=*`, {
      headers: {
        'apikey': DB_API_KEY,
        'Authorization': `Bearer ${DB_API_KEY}`
      }
    });

    if (!res.ok) {
      throw new Error(`Query failed: ${res.status}`);
    }

    const plants = await res.json();

    if (plants.length === 0) {
      console.log(`❌ No plant found with nickname: ${nickname}`);
      return;
    }

    const plant = plants[0];
    
    console.log('🌱 Plant Details:');
    console.log('─────────────────────────────────────');
    console.log(`Nickname: ${plant.nickname}`);
    console.log(`Species: ${plant.species}`);
    console.log(`Personality: ${plant.personality}`);
    console.log(`Phone: ${plant.phone_e164}`);
    console.log(`Location: ${plant.zipcode}, ${plant.city}, ${plant.country}`);
    console.log(`Coordinates: ${plant.lat}, ${plant.lon}`);
    console.log('');
    
    console.log('💧 Watering Schedule:');
    console.log('─────────────────────────────────────');
    console.log(`Base Hours: ${plant.base_hours}h`);
    console.log(`Adjusted Hours: ${plant.adjusted_hours}h`);
    console.log(`Calibration: ${plant.calibration_hours}h`);
    console.log(`Effective Schedule: ${plant.adjusted_hours + plant.calibration_hours}h`);
    console.log('');
    
    console.log('⏰ Timing:');
    console.log('─────────────────────────────────────');
    
    const lastWatered = new Date(plant.last_watered_ts);
    const nextDue = new Date(plant.next_due_ts);
    const now = new Date();
    
    console.log(`Last Watered: ${lastWatered.toLocaleString()}`);
    console.log(`Next Due: ${nextDue.toLocaleString()}`);
    console.log(`Current Time: ${now.toLocaleString()}`);
    console.log('');
    
    const timeUntilDue = nextDue - now;
    const hoursUntilDue = Math.round(timeUntilDue / (1000 * 60 * 60));
    const daysUntilDue = Math.floor(hoursUntilDue / 24);
    const remainingHours = hoursUntilDue % 24;
    
    if (timeUntilDue < 0) {
      console.log(`🚨 STATUS: OVERDUE by ${Math.abs(hoursUntilDue)} hours!`);
      console.log(`   Should have been watered ${Math.abs(daysUntilDue)} days and ${Math.abs(remainingHours)} hours ago`);
    } else if (hoursUntilDue < 24) {
      console.log(`⏰ STATUS: Due soon in ${hoursUntilDue} hours`);
    } else {
      console.log(`✅ STATUS: Next reminder in ${daysUntilDue} days and ${remainingHours} hours`);
    }
    
    console.log('');
    console.log('📊 Pot Details:');
    console.log('─────────────────────────────────────');
    console.log(`Size: ${plant.pot_size}`);
    console.log(`Material: ${plant.pot_material}`);
    console.log(`Light: ${plant.light_exposure}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get nickname from command line or use default
const nickname = process.argv[2] || 'Mama';
checkPlant(nickname);
