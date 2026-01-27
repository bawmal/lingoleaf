// Quick script to check when next messages are due
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.DB_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DB_API_KEY
);

async function checkNextMessages() {
  const { data: plants, error } = await supabase
    .from('plants')
    .select('nickname, species, phone_e164, next_due_ts, created_at')
    .order('next_due_ts', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📅 Next scheduled messages:\n');
  
  const now = Date.now();
  
  plants.forEach((p, i) => {
    const hoursUntil = (p.next_due_ts - now) / (1000 * 60 * 60);
    const dueDate = new Date(p.next_due_ts);
    const isPast = hoursUntil < 0;
    
    console.log(`${i + 1}. ${p.nickname || p.species}`);
    console.log(`   Phone: ${p.phone_e164}`);
    console.log(`   Due: ${dueDate.toLocaleString()}`);
    console.log(`   ${isPast ? '⚠️ OVERDUE by' : '⏰ In'} ${Math.abs(hoursUntil).toFixed(1)} hours`);
    console.log('');
  });
}

checkNextMessages().catch(console.error);
