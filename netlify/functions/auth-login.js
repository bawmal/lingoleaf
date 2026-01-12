const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.DB_URL;
const SUPABASE_KEY = process.env.DB_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
    return response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { email, password } = JSON.parse(event.body);

        if (!email || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email and password are required' })
            };
        }

        // Find shop by email
        const shops = await supabaseRequest(`shops?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`);
        
        if (!shops || shops.length === 0) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid email or password' })
            };
        }

        const shop = shops[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, shop.password_hash);
        if (!validPassword) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid email or password' })
            };
        }

        // Check if account is active
        if (!shop.is_active) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Account is deactivated' })
            };
        }

        // Generate JWT token
        const token = jwt.sign(
            { shopId: shop.id, email: shop.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                token,
                shop: {
                    id: shop.id,
                    email: shop.email,
                    businessName: shop.business_name,
                    contactName: shop.contact_name,
                    plan: shop.plan,
                    trialEndsAt: shop.trial_ends_at
                }
            })
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
