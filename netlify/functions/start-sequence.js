const jwt = require('jsonwebtoken');
const twilio = require('twilio');

const SUPABASE_URL = process.env.DB_URL;
const SUPABASE_KEY = process.env.DB_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

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
    return response.json();
}

function verifyToken(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
}

// SMS message templates by personality
const welcomeMessages = {
    sassy: "Hey there, plant parent! 🌿 Your new green baby just told me they're SO excited to be home with you. I'm their translator now. Get ready for some real talk about water, sunshine, and drama. Reply STOP to opt out.",
    zen: "Greetings, peaceful one. 🌱 Your plant has chosen you as their guardian. I am here to help you both find harmony. Together, we will nurture growth and tranquility. Reply STOP to opt out.",
    anxious: "Oh hi! 😰 Your plant asked me to check in... they're a little nervous about the new environment but SO happy to meet you! I'll help make sure everything goes smoothly, okay? Reply STOP to opt out.",
    formal: "Good day. Your recently acquired botanical specimen has been registered in our care system. You will receive periodic maintenance notifications to ensure optimal plant health. Reply STOP to opt out."
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const decoded = verifyToken(event);
        const shopId = decoded.shopId;
        
        const { customerId } = JSON.parse(event.body);

        if (!customerId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Customer ID required' })
            };
        }

        // Get customer
        const customers = await supabaseRequest(
            `b2b_customers?id=eq.${customerId}&shop_id=eq.${shopId}&select=*`
        );

        if (!customers || customers.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Customer not found' })
            };
        }

        const customer = customers[0];

        // Get shop info
        const shops = await supabaseRequest(`shops?id=eq.${shopId}&select=business_name`);
        const shopName = shops[0]?.business_name || 'Your local plant shop';

        // Get welcome message based on personality
        const personality = customer.personality || 'zen';
        let message = welcomeMessages[personality];
        
        // Add shop name context
        message = `From ${shopName}: ${message}`;

        // Send SMS
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_FROM_NUMBER,
            to: customer.phone
        });

        // Update customer record
        await supabaseRequest(
            `b2b_customers?id=eq.${customerId}`,
            'PATCH',
            {
                sequence_day: 1,
                sequence_started_at: new Date().toISOString(),
                last_message_at: new Date().toISOString()
            }
        );

        // Log message
        await supabaseRequest('b2b_messages', 'POST', {
            customer_id: customerId,
            shop_id: shopId,
            direction: 'outbound',
            message_type: 'welcome',
            content: message,
            status: 'sent'
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Welcome message sent!'
            })
        };

    } catch (error) {
        console.error('Start sequence error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.message === 'No token provided') {
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
