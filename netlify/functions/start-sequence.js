// netlify/functions/start-sequence.js
// Sends welcome SMS to B2B customers and starts their care sequence

const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        // Verify auth token
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }
        const token = authHeader.replace('Bearer ', '');

        // Check env vars
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_ANON_KEY) {
            console.error('Missing Supabase env vars');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
        }

        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.error('Missing Twilio env vars');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'SMS service not configured' }) };
        }

        // Parse JSON with error handling
        let data;
        try {
            data = JSON.parse(event.body || '{}');
        } catch (parseError) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
        }

        const { customerId } = data;

        if (!customerId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing customerId' }) };
        }

        // Use anon key client to verify user token
        const supabaseAuth = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Verify the token and get user
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !user) {
            console.error('Auth error:', authError);
            return { statusCode: 401, headers, body: JSON.stringify({ error: authError?.message || 'Invalid token' }) };
        }
        
        // Use service role client for data operations
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get the shop for this user
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('id, business_name, twilio_number')
            .eq('id', user.id)
            .single();

        if (shopError || !shop) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Shop not found' }) };
        }

        if (!shop.twilio_number) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Twilio number assigned to this shop. Contact support.' }) };
        }

        // Get the customer
        const { data: customer, error: customerError } = await supabase
            .from('b2b_customers')
            .select('*')
            .eq('id', customerId)
            .eq('shop_id', shop.id)
            .single();

        if (customerError || !customer) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Customer not found' }) };
        }

        // Create Twilio client
        const twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        // Create welcome message
        const plantName = customer.plant_name || customer.plant_type;
        const welcomeMessage = `🌱 Hi ${customer.name}! This is ${shop.business_name}. We've registered your ${plantName} for personalized care reminders. You'll receive helpful tips to keep your plant thriving! Reply STOP to opt out.`;

        // Send SMS
        const message = await twilioClient.messages.create({
            to: customer.phone,
            from: shop.twilio_number,
            body: welcomeMessage
        });

        console.log(`✅ SMS sent to ${customer.phone} from ${shop.twilio_number}. SID: ${message.sid}`);

        // Update customer to mark sequence started
        const { error: updateError } = await supabase
            .from('b2b_customers')
            .update({ 
                sequence_day: 1,
                last_message_at: new Date().toISOString()
            })
            .eq('id', customerId);

        if (updateError) {
            console.error('Failed to update customer:', updateError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: `Welcome SMS sent to ${customer.name}`,
                sid: message.sid
            })
        };

    } catch (error) {
        console.error('Start sequence error:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                details: error.code || error.status || 'unknown'
            })
        };
    }
};
