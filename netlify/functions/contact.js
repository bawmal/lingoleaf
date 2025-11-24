// netlify/functions/contact.js
// Handle contact form submissions and send emails via Resend

const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, subject, message } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Map subject categories to friendly names
    const subjectMap = {
      'enquiries': 'General Enquiries',
      'feature-request': 'Feature Request',
      'fixes-required': 'Fixes Required',
      'feedback': 'Feedback',
      'support': 'Technical Support',
      'partnership': 'Partnership Inquiry',
      'other': 'Other'
    };

    const subjectLine = subjectMap[subject] || 'Contact Form Submission';

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LingoLeaf Contact <noreply@lingoleaf.ai>',
        to: ['info@lingoleaf.ai'],
        reply_to: email,
        subject: `[${subjectLine}] ${name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2d5016 0%, #4a7c2c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .field { margin-bottom: 20px; }
              .label { font-weight: 600; color: #2d5016; margin-bottom: 5px; }
              .value { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #7ba05b; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🌱 New Contact Form Submission</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${subjectLine}</p>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">From:</div>
                  <div class="value">${name}</div>
                </div>
                
                <div class="field">
                  <div class="label">Email:</div>
                  <div class="value"><a href="mailto:${email}" style="color: #2d5016;">${email}</a></div>
                </div>
                
                <div class="field">
                  <div class="label">Category:</div>
                  <div class="value">${subjectLine}</div>
                </div>
                
                <div class="field">
                  <div class="label">Message:</div>
                  <div class="value" style="white-space: pre-wrap;">${message}</div>
                </div>
              </div>
              <div class="footer">
                <p>Sent from LingoLeaf Contact Form</p>
                <p>Reply directly to this email to respond to ${name}</p>
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      throw new Error('Failed to send email');
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: result.id
      })
    };

  } catch (error) {
    console.error('Contact form error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send message. Please try again later.' 
      })
    };
  }
};