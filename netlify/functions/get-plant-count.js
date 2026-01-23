// netlify/functions/get-plant-count.js
const { createClient } = require('@supabase/supabase-js');

const DB_URL = process.env.DB_URL || process.env.SUPABASE_URL;
const DB_API_KEY = process.env.DB_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const phone = params.phone;
    const email = params.email;

    if (!phone && !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Phone or email required' })
      };
    }

    const supabase = createClient(DB_URL, DB_API_KEY);

    // Get plants for this user
    let query = supabase.from('plants').select('*');
    
    if (phone) {
      query = query.eq('phone_e164', phone);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: plants, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error' })
      };
    }

    // Check if lifetime user
    let maxPlants = 1; // Default for regular users
    
    if (phone) {
      const { data: lifetimeUser } = await supabase
        .from('lifetime_users')
        .select('max_plants')
        .eq('phone_e164', phone)
        .single();

      if (lifetimeUser) {
        maxPlants = lifetimeUser.max_plants || 5;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        count: plants.length,
        max_plants: maxPlants,
        is_lifetime: maxPlants > 1
      })
    };

  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
