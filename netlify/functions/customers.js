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

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // Verify JWT
        const decoded = verifyToken(event);
        const shopId = decoded.shopId;

        // GET - List customers
        if (event.httpMethod === 'GET') {
            const customers = await supabaseRequest(
                `b2b_customers?shop_id=eq.${shopId}&order=created_at.desc&select=*`
            );
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ customers })
            };
        }

        // POST - Add customer
        if (event.httpMethod === 'POST') {
            const { name, phone, email, plantType, plantName, personality } = JSON.parse(event.body);

            if (!name || !phone) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Name and phone are required' })
                };
            }

            // Format phone number
            let formattedPhone = phone.replace(/\D/g, '');
            if (!formattedPhone.startsWith('+')) {
                if (formattedPhone.length === 10) {
                    formattedPhone = '+1' + formattedPhone;
                } else if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
                    formattedPhone = '+1' + formattedPhone;
                } else {
                    formattedPhone = '+' + formattedPhone;
                }
            }

            const customers = await supabaseRequest('b2b_customers', 'POST', {
                shop_id: shopId,
                name,
                phone: formattedPhone,
                email: email || null,
                plant_type: plantType || 'general',
                plant_name: plantName || null,
                personality: personality || 'zen'
            });

            return {
                statusCode: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    success: true,
                    customer: customers[0] 
                })
            };
        }

        // DELETE - Remove customer
        if (event.httpMethod === 'DELETE') {
            const customerId = event.queryStringParameters?.id;
            
            if (!customerId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Customer ID required' })
                };
            }

            await supabaseRequest(
                `b2b_customers?id=eq.${customerId}&shop_id=eq.${shopId}`,
                'DELETE'
            );

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: true })
            };
        }

        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

    } catch (error) {
        console.error('Customers error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.message === 'No token provided') {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
