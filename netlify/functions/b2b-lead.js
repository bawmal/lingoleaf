// netlify/functions/b2b-lead.js
// Captures B2B trial leads and sends notification email

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// HTML escape helper to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

exports.handler = async (event) => {
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
        let data;
        try {
            data = JSON.parse(event.body || '{}');
        } catch (parseError) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
        }

        const { name, shopName, phone, email } = data;

        if (!name || !shopName || !phone || !email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'All fields are required' })
            };
        }

        // Validate field types and lengths
        if (typeof name !== 'string' || name.length > 100) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid name field' }) };
        }
        if (typeof shopName !== 'string' || shopName.length > 200) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid shop name field' }) };
        }
        if (typeof phone !== 'string' || phone.length > 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid phone field' }) };
        }
        if (typeof email !== 'string' || email.length > 200 || !email.includes('@')) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email field' }) };
        }

        // Send notification email to b@lingoleaf.ai
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #02B91A; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 16px; }
        .label { font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 18px; color: #1C1C1C; margin-top: 4px; }
        .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🌱 New B2B Trial Request</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Contact Name</div>
                <div class="value">${escapeHtml(name)}</div>
            </div>
            <div class="field">
                <div class="label">Shop / Nursery Name</div>
                <div class="value">${escapeHtml(shopName)}</div>
            </div>
            <div class="field">
                <div class="label">Phone Number</div>
                <div class="value"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>
            </div>
            <div class="field">
                <div class="label">Email Address</div>
                <div class="value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
            </div>
            <div class="footer">
                Submitted on ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}
            </div>
        </div>
    </div>
</body>
</html>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'LingoLeaf <hello@lingoleaf.ai>',
                to: 'b@lingoleaf.ai',
                subject: `🌱 New B2B Trial Request: ${shopName}`,
                html: emailHtml,
                reply_to: email
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Resend error:', result);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to submit request. Please try again.' })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Lead captured successfully' })
        };

    } catch (error) {
        console.error('B2B lead error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
