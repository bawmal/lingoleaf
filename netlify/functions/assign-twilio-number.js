// netlify/functions/assign-twilio-number.js
// Admin function to assign Twilio numbers to B2B shops

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.DB_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DB_API_KEY;

async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
    return { ok: response.ok, data: await response.json() };
}

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

        // Check if number is already assigned to another shop (using raw REST API)
        const checkResult = await supabaseRequest(
            `shops?twilio_number=eq.${encodeURIComponent(twilioNumber)}&id=neq.${shopId}&select=id,business_name`
        );

        if (checkResult.data && checkResult.data.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Number already assigned to ${checkResult.data[0].business_name}` 
                })
            };
        }

        // Update shop with Twilio number using raw REST API (bypasses schema cache)
        const updateResult = await supabaseRequest(
            `shops?id=eq.${shopId}`,
            'PATCH',
            { twilio_number: twilioNumber }
        );

        if (!updateResult.ok) {
            console.error('Supabase error:', updateResult.data);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: updateResult.data.message || 'Update failed' })
            };
        }

        const shop = updateResult.data[0];

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                shop,
                message: `Assigned ${twilioNumber} to ${shop?.business_name || 'shop'}`
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
