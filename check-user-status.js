// Check user status - regular vs lifetime
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkUserStatus() {
    const supabase = createClient(
        process.env.DB_URL,
        process.env.DB_API_KEY
    );

    const email = 'gardnerpaulam@gmail.com';

    // Check plants for this email
    const { data: plants, error: plantsError } = await supabase
        .from('plants')
        .select('*')
        .eq('email', email);

    if (plantsError) {
        console.error('Error fetching plants:', plantsError);
        return;
    }

    console.log(`\n📊 User: ${email}`);
    console.log(`📱 Total plants registered: ${plants.length}`);
    
    if (plants.length > 0) {
        const phone = plants[0].phone_e164;
        console.log(`📞 Phone: ${phone}`);

        // Check if lifetime user
        const { data: lifetimeUser, error: lifetimeError } = await supabase
            .from('lifetime_users')
            .select('*')
            .eq('phone_e164', phone)
            .single();

        if (lifetimeUser) {
            console.log(`\n✅ LIFETIME USER`);
            console.log(`   Max plants: ${lifetimeUser.max_plants}`);
            console.log(`   Created: ${lifetimeUser.created_at}`);
        } else {
            console.log(`\n👤 REGULAR USER`);
            
            // Check trial status
            const plant = plants[0];
            console.log(`   Subscription status: ${plant.subscription_status || 'trial'}`);
            console.log(`   Trial started: ${plant.trial_started_at || 'N/A'}`);
            
            if (plant.trial_started_at) {
                const trialStart = new Date(plant.trial_started_at);
                const trialEnd = new Date(trialStart);
                trialEnd.setDate(trialEnd.getDate() + 30); // 30-day trial
                
                const now = new Date();
                const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
                
                console.log(`   Trial ends: ${trialEnd.toLocaleDateString()} at ${trialEnd.toLocaleTimeString()}`);
                console.log(`   Days remaining: ${daysRemaining} days`);
                
                if (daysRemaining <= 0) {
                    console.log(`   ⚠️  TRIAL EXPIRED`);
                } else if (daysRemaining <= 7) {
                    console.log(`   ⚠️  Trial ending soon!`);
                }
            }
            
            console.log(`   Stripe customer ID: ${plant.stripe_customer_id || 'None'}`);
            console.log(`   Stripe subscription ID: ${plant.stripe_subscription_id || 'None'}`);
        }

        console.log(`\n🌱 Plants:`);
        plants.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.nickname || p.species} (${p.species})`);
            console.log(`      Registered: ${new Date(p.created_at).toLocaleDateString()}`);
        });
    }
}

checkUserStatus().catch(console.error);
