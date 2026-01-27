// Test SMS sending by making one plant due now
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSMS() {
    const supabase = createClient(
        process.env.DB_URL,
        process.env.DB_API_KEY
    );

    // Get one plant
    const { data: plants, error } = await supabase
        .from('plants')
        .select('*')
        .limit(1);

    if (error || !plants || plants.length === 0) {
        console.error('No plants found:', error);
        return;
    }

    const plant = plants[0];
    console.log(`\n📋 Testing SMS for: ${plant.nickname || plant.species}`);
    console.log(`   Phone: ${plant.phone_e164}`);
    console.log(`   Twilio Number: ${plant.twilio_number}`);

    // Set next_due_ts to NOW
    const now = Date.now();
    const { error: updateError } = await supabase
        .from('plants')
        .update({ next_due_ts: now })
        .eq('id', plant.id);

    if (updateError) {
        console.error('Update failed:', updateError);
        return;
    }

    console.log(`\n✅ Set plant to be due NOW`);
    console.log(`\n🔄 Triggering schedule-check...`);

    // Trigger schedule-check
    const fetch = require('node-fetch');
    const response = await fetch('https://lingoleaf.ai/.netlify/functions/schedule-check', {
        method: 'POST'
    });

    const result = await response.json();
    console.log(`\n📊 Result:`, result);
    console.log(`\n✅ Check Netlify function logs for SMS status`);
    console.log(`   Go to: Netlify Dashboard → Functions → schedule-check → Logs`);
    console.log(`\n📱 Check Twilio logs for SMS delivery`);
    console.log(`   Go to: Twilio Console → Messaging → Logs`);
}

testSMS().catch(console.error);
