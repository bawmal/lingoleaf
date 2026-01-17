// netlify/functions/assign-twilio-number.js
// Admin function to assign Twilio numbers to B2B shops

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { shopId, twilioNumber } = JSON.parse(event.body);

        if (!shopId || !twilioNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing shopId or twilioNumber' })
            };
        }

        // Validate phone number format
        if (!twilioNumber.startsWith('+') || twilioNumber.length < 10) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid phone number format. Use +1234567890' })
            };
        }

        // Use service role to bypass RLS
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Check if number is already assigned to another shop
        const { data: existingShop } = await supabase
            .from('shops')
            .select('id, business_name')
            .eq('twilio_number', twilioNumber)
            .neq('id', shopId)
            .single();

        if (existingShop) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Number already assigned to ${existingShop.business_name}` 
                })
            };
        }

        // Update shop with Twilio number
        const { data: shop, error } = await supabase
            .from('shops')
            .update({ twilio_number: twilioNumber })
            .eq('id', shopId)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: error.message })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                shop,
                message: `Assigned ${twilioNumber} to ${shop.business_name}`
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
