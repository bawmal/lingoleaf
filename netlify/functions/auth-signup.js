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
            'Prefer': 'return=representation'
        }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Database error');
    }
    return data;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { email, password, businessName, contactName, phone } = JSON.parse(event.body);

        // Validation
        if (!email || !password || !businessName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email, password, and business name are required' })
            };
        }

        if (password.length < 6) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Password must be at least 6 characters' })
            };
        }

        // Check if email already exists
        const existing = await supabaseRequest(`shops?email=eq.${encodeURIComponent(email)}&select=id`);
        if (existing && existing.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email already registered' })
            };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create shop
        const shops = await supabaseRequest('shops', 'POST', {
            email: email.toLowerCase(),
            password_hash: passwordHash,
            business_name: businessName,
            contact_name: contactName || null,
            phone: phone || null
        });

        const shop = shops[0];

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
                    plan: shop.plan
                }
            })
        };
    } catch (error) {
        console.error('Signup error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
