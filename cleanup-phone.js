// Cleanup script to remove phone number from lifetime tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function cleanup() {
    const phone = '+16477866230'; // E.164 format
    
    const supabase = createClient(
        process.env.DB_URL,
        process.env.DB_API_KEY
    );
    
    console.log(`🧹 Cleaning up phone: ${phone}\n`);
    
    // Check lifetime_codes table
    console.log('Checking lifetime_codes table...');
    const { data: codes, error: codesError } = await supabase
        .from('lifetime_codes')
        .select('*')
        .eq('redeemed_by_phone', phone);
    
    if (codesError) {
        console.error('Error checking lifetime_codes:', codesError);
    } else {
        console.log(`Found ${codes?.length || 0} records in lifetime_codes`);
        if (codes && codes.length > 0) {
            console.log('Records:', codes);
            
            // Clear the redeemed_by_phone field
            const { error: updateError } = await supabase
                .from('lifetime_codes')
                .update({ 
                    redeemed_by_phone: null,
                    redeemed_by_email: null,
                    is_used: false,
                    redeemed_at: null
                })
                .eq('redeemed_by_phone', phone);
            
            if (updateError) {
                console.error('Error updating lifetime_codes:', updateError);
            } else {
                console.log('✅ Cleared redeemed_by_phone from lifetime_codes');
            }
        }
    }
    
    // Check lifetime_users table
    console.log('\nChecking lifetime_users table...');
    const { data: users, error: usersError } = await supabase
        .from('lifetime_users')
        .select('*')
        .eq('phone_e164', phone);
    
    if (usersError) {
        console.error('Error checking lifetime_users:', usersError);
    } else {
        console.log(`Found ${users?.length || 0} records in lifetime_users`);
        if (users && users.length > 0) {
            console.log('Records:', users);
            
            // Delete from lifetime_users
            const { error: deleteError } = await supabase
                .from('lifetime_users')
                .delete()
                .eq('phone_e164', phone);
            
            if (deleteError) {
                console.error('Error deleting from lifetime_users:', deleteError);
            } else {
                console.log('✅ Deleted from lifetime_users');
            }
        }
    }
    
    console.log('\n✅ Cleanup complete! You can now test redemption.');
}

cleanup().catch(console.error);
