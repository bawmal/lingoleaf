// netlify/functions/redeem-code.js
// Redeems lifetime deal codes for B2C users

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        // Check env vars
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing Supabase env vars');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
        }

        const { code, email, phone } = JSON.parse(event.body);

        if (!code || !email || !phone) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        // Normalize the code (remove dashes, uppercase)
        const normalizedCode = code.toUpperCase().replace(/-/g, '');

        // Create Supabase client with service role
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Look up the code (check both with and without dashes)
        const { data: codeRecord, error: lookupError } = await supabase
            .from('lifetime_codes')
            .select('*')
            .or(`code.eq.${code},code.eq.${normalizedCode}`)
            .single();

        if (lookupError || !codeRecord) {
            console.log('Code lookup failed:', lookupError);
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid code. Please check and try again.' }) };
        }

        // Check if already used
        if (codeRecord.is_used) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'This code has already been redeemed.' }) };
        }

        // Check if phone already has a lifetime deal
        const { data: existingLifetime } = await supabase
            .from('lifetime_codes')
            .select('id')
            .eq('redeemed_by_phone', phone)
            .eq('is_used', true)
            .single();

        if (existingLifetime) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'This phone number already has a lifetime deal.' }) };
        }

        // Mark code as redeemed
        const { error: updateError } = await supabase
            .from('lifetime_codes')
            .update({
                is_used: true,
                redeemed_at: new Date().toISOString(),
                redeemed_by_phone: phone,
                redeemed_by_email: email
            })
            .eq('id', codeRecord.id);

        if (updateError) {
            console.error('Failed to update code:', updateError);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to redeem code. Please try again.' }) };
        }

        // Create or update lifetime_users record for plant limit tracking
        const { error: userError } = await supabase
            .from('lifetime_users')
            .upsert({
                phone_e164: phone,
                email: email,
                max_plants: 5,
                code_id: codeRecord.id,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'phone_e164'
            });

        if (userError) {
            console.error('Failed to create lifetime user:', userError);
            // Don't fail the request - the code is already redeemed
        }

        console.log(`✅ Lifetime code redeemed: ${code} by ${email} (${phone})`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Lifetime deal activated!',
                maxPlants: 5
            })
        };

    } catch (error) {
        console.error('Redeem code error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
