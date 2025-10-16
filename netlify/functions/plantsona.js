// netlify/functions/plantsona.js
// PlantSona: AI-powered plant personality generator with OpenAI GPT-4 Vision

const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const { image, personality, nickname } = JSON.parse(event.body);

    // Validate inputs
    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image is required' })
      };
    }

    if (!personality || !['sassy', 'zen', 'anxious', 'formal'].includes(personality.toLowerCase())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid personality is required (sassy, zen, anxious, formal)' })
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    console.log('API Key check:', OPENAI_API_KEY ? 'Key present' : 'No key');
    
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    // Define personality styles
    const personalityStyles = {
      sassy: {
        name: 'Sassy & Demanding',
        style: 'Dramatic, judgmental tone with contemporary slang. Use phrases like "You BETTER", "don\'t even THINK about", "I\'ll throw a fit!", with emojis like 💅 😤'
      },
      formal: {
        name: 'Formal & Proper',
        style: 'Reserved politeness with superiority. Use phrases like "One would be most obliged", "quite dry", "as is proper for a specimen of my caliber", "I feel it is my duty"'
      },
      anxious: {
        name: 'Anxious & Concerned',
        style: 'Panicky, focusing on dramatic consequences. Use phrases like "Oh my gosh, PLEASE", "I\'m TERRIFIED", "I\'m SCARED", with emojis like 😱 😭'
      },
      zen: {
        name: 'Zen & Gently Reminding',
        style: 'Serene, non-judgmental, focused on balance. Use phrases like "When you notice", "like autumn leaves", "I find peace in", "In the rhythm of nature", with emojis like 🧘‍♀️ 🌿'
      }
    };

    const selectedStyle = personalityStyles[personality.toLowerCase()];

    // Create prompt for OpenAI
    const systemPrompt = `You are a plant identification and personality expert. Analyze plant images and provide responses in JSON format with accurate plant identification, care instructions, fun facts, and personality-driven messages.`;

    const userPrompt = `Analyze this plant image and provide a response in the following JSON format:

{
  "name": "Common and scientific name of the plant",
  "careInstructions": "Detailed care instructions (watering, light, humidity, etc.)",
  "funFact": "An interesting fact about this plant",
  "voiceMessage": "A personalized message from the plant to its owner"
}

IMPORTANT INSTRUCTIONS:
1. Identify the plant species accurately
2. Provide scientifically accurate care instructions
3. Include an interesting fun fact
4. Write the voiceMessage in the "${selectedStyle.name}" personality style: ${selectedStyle.style}
5. ${nickname ? `The plant's nickname is "${nickname}" - use this in the voiceMessage` : 'The plant doesn\'t have a nickname, so use its species name'}
6. The voiceMessage should be written from the plant's perspective, addressing its owner directly
7. REWRITE the care instructions and fun fact completely in the personality's distinctive style, not just wrapped in personality-appropriate language

Return ONLY valid JSON, no other text.`;

    console.log('Calling OpenAI GPT-4 Vision API...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      let errorMessage = 'Failed to generate PlantSona';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage = errorText.substring(0, 200);
      }
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: errorMessage,
          details: errorText 
        })
      };
    }

    const result = await response.json();
    console.log('OpenAI response received');

    // Extract the generated text
    const generatedText = result.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON from response (remove markdown code blocks if present)
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from OpenAI response');
    }

    const plantData = JSON.parse(jsonMatch[0]);

    // Return the PlantSona result
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        plantsona: {
          species: plantData.name || 'Unknown Plant',
          nickname: nickname || plantData.name || 'Your Plant',
          personality: personality.toLowerCase(),
          careInstructions: plantData.careInstructions || '',
          funFacts: plantData.funFact || '',
          voiceMessage: plantData.voiceMessage || '',
          confidence: result.choices?.[0]?.finish_reason === 'stop' ? 'high' : 'medium'
        }
      })
    };

  } catch (error) {
    console.error('PlantSona error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
