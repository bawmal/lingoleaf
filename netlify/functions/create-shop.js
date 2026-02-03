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

    // Check request size
    if (event.body && event.body.length > 10000) {
        return { statusCode: 413, headers, body: JSON.stringify({ error: 'Request too large' }) };
    }

    try {
        // Parse JSON with error handling
        let requestData;
        try {
            requestData = JSON.parse(event.body || '{}');
        } catch (parseError) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
        }

        const { userId, email, businessName } = requestData;

        if (!userId || !email || !businessName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Validate field types and lengths
        if (typeof email !== 'string' || email.length > 200 || !email.includes('@')) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email format' }) };
        }
        if (typeof businessName !== 'string' || businessName.length > 200) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid business name' }) };
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
