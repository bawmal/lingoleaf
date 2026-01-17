// netlify/functions/create-shop.js
// Creates a shop record for B2B signup (bypasses RLS with service role)

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { userId, email, businessName } = JSON.parse(event.body);

        if (!userId || !email || !businessName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: userId, email, businessName' })
            };
        }

        // Use service role to bypass RLS
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase
            .from('shops')
            .insert({
                id: userId,
                email: email,
                business_name: businessName,
                plan: 'trial'
            })
            .select()
            .single();

        if (error) {
            // Handle duplicate key error gracefully
            if (error.code === '23505') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: 'Shop already exists', existing: true })
                };
            }
            throw error;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, shop: data })
        };

    } catch (error) {
        console.error('Create shop error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
