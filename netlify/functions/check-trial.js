// Check if user's trial has expired and needs to subscribe

const SUPABASE_URL = process.env.DB_URL;
const SUPABASE_KEY = process.env.DB_API_KEY;

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
        return { statusCode: 405, body: 'Method not allowed' };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'email required' })
            };
        }

        // Find plant by email
        let query = `plants?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;
        
        const plants = await supabaseRequest(query);
        
        if (!plants || plants.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'No plants found for this email' })
            };
        }

        const user = plants[0];
        const now = new Date();
        const trialStart = new Date(user.trial_started_at || user.created_at);
        const trialEnd = new Date(trialStart);
        trialEnd.setDate(trialEnd.getDate() + 30); // 30-day trial

        const trialExpired = now > trialEnd;
        const hasActiveSubscription = user.subscription_status === 'active';
        const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));

        // Determine access status
        let accessStatus = 'active';
        let requiresPayment = false;

        if (trialExpired && !hasActiveSubscription) {
            accessStatus = 'expired';
            requiresPayment = true;
        } else if (!trialExpired) {
            accessStatus = 'trial';
        } else if (hasActiveSubscription) {
            accessStatus = 'subscribed';
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                userId: user.id,
                email: user.email,
                accessStatus,
                requiresPayment,
                trialExpired,
                daysRemaining,
                trialEndDate: trialEnd.toISOString(),
                subscriptionStatus: user.subscription_status || 'none'
            })
        };
    } catch (error) {
        console.error('Check trial error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
