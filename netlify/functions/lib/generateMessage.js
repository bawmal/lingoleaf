// netlify/functions/lib/generateMessage.js
// AI-powered message generation for plant personalities

const crypto = require('crypto');

// Lazy initialization of OpenAI client
let openai = null;
function getOpenAI() {
  if (!openai) {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Personality definitions - THE PLANT'S VOICE
const PERSONALITIES = {
  zen: {
    description: "Calm, mindful, peaceful. Speaks gently with gratitude. Finds peace in stillness.",
    fallbackPrefix: "🧘 ",
    voiceExample: "Hey, it's me. I'm feeling peaceful today."
  },
  sassy: {
    description: "Playful, confident, dramatic. Main character energy. Treats owner like bestie.",
    fallbackPrefix: "😎 ",
    voiceExample: "Heyyy! Your favorite plant here. Miss me?"
  },
  anxious: {
    description: "Nervous, apologetic, worried. Overthinks everything. Doesn't want to be a burden.",
    fallbackPrefix: "😰 ",
    voiceExample: "Hi... sorry to bother you but... I might need something?"
  },
  formal: {
    description: "Professional, dignified, matter-of-fact. Distinguished plant with standards.",
    fallbackPrefix: "",
    voiceExample: "Good day. This is your plant with a status update."
  }
};

// Season detection based on latitude and date
function getSeason(lat, date = new Date()) {
  const month = date.getMonth(); // 0-11
  const isNorthern = lat >= 0;
  
  if (month >= 2 && month <= 4) return isNorthern ? 'spring' : 'autumn';
  if (month >= 5 && month <= 7) return isNorthern ? 'summer' : 'winter';
  if (month >= 8 && month <= 10) return isNorthern ? 'autumn' : 'spring';
  return isNorthern ? 'winter' : 'summer';
}

// Check if we're in a season transition period
function isWithinTransitionPeriod() {
  const month = new Date().getMonth(); // 0-11
  // Transition periods: late Feb-Mar, late May-Jun, late Aug-Sep, late Nov-Dec
  const transitionMonths = [1, 2, 4, 5, 7, 8, 10, 11];
  return transitionMonths.includes(month);
}

// Hash message for deduplication
function hashMessage(msg) {
  return crypto.createHash('md5').update(msg).digest('hex').substring(0, 8);
}

// Check if message is too similar to recent ones
function isTooSimilar(newMsg, recentMessages) {
  if (!recentMessages || recentMessages.length === 0) return false;
  const newHash = hashMessage(newMsg);
  return recentMessages.some(m => hashMessage(m) === newHash);
}

// Determine if plant should include its name
function shouldIncludeName(plant) {
  const isFirstMessage = (plant.messages_sent || 0) === 0;
  const lastMessageAt = plant.last_message_at ? new Date(plant.last_message_at).getTime() : 0;
  const daysSinceLastMessage = (Date.now() - lastMessageAt) / 86400000;
  const isLongGap = daysSinceLastMessage >= 7;
  const isNthMessage = (plant.messages_sent || 0) % 4 === 0; // Every 4th
  
  return isFirstMessage || isLongGap || isNthMessage;
}

// Determine if we should include an educational tip
function shouldIncludeTip(plant) {
  const wateringsSinceLastTip = plant.waterings_since_tip || 0;
  const totalWaterings = plant.total_waterings || 0;
  const isNewUserMilestone = totalWaterings === 3; // 3rd watering = teach time
  const isSeasonTransition = isWithinTransitionPeriod();
  
  // Include tip if ANY of these are true:
  return (
    wateringsSinceLastTip >= 5 ||      // 5+ waterings since last tip
    isNewUserMilestone ||               // New user's 3rd watering
    isSeasonTransition                  // Season is about to change
  );
}

// Main generation function
async function generateMessage(context) {
  const { plant, user, environment, request } = context;
  const personality = PERSONALITIES[plant.personality] || PERSONALITIES.formal;
  
  // Determine if name and tip should be included
  const includeName = shouldIncludeName(plant);
  const includeTip = request.messageType === 'done_confirmation' && shouldIncludeTip(plant);
  
  const systemPrompt = `You ARE a ${plant.species} plant named "${plant.nickname}" with a ${plant.personality} personality. You speak in FIRST PERSON to your owner.

YOU ARE THE PLANT. You talk about yourself, your soil, your needs. The owner is caring for YOU.

PERSONALITY GUIDELINES:
- zen: Calm, mindful, peaceful. Use 🧘 emoji. Speak gently with gratitude. You find peace in stillness.
- sassy: Playful, confident, dramatic. Use 😎💅✨ emojis. You're the main character. Treat your owner like your bestie.
- anxious: Nervous, apologetic, worried. Use 😰😬🥹 emojis. You overthink everything. You don't want to be a burden.
- formal: Professional, dignified, matter-of-fact. No emojis. You're a distinguished plant with standards.

RULES:
1. Keep messages under 140 characters (SMS limit)
2. ALWAYS speak as the plant in first person ("I", "my", "me")
3. Never repeat phrases from recent messages
4. Match the personality tone exactly
5. Include seasonal context naturally (how YOU the plant feel in this season)
6. For new users (< 7 days): Introduce yourself, be welcoming
7. For experienced users (> 30 days): Be familiar, like talking to an old friend
8. Always end with clear action if needed (DRY/DAMP/DONE)
9. Use ${request.language === 'fr' ? 'French' : 'English'} language`;

  // Randomly decide whether to include weather (50% chance for variety)
  const includeWeather = Math.random() < 0.5;
  const weatherContext = (includeWeather && environment.temperature != null && environment.condition) 
    ? `Current weather: ${Math.round(environment.temperature)}°${environment.units === 'imperial' ? 'F' : 'C'}, ${environment.condition}. You can mention this naturally if it's relevant to your needs.`
    : '';

  const userPrompt = `Generate a ${request.messageType} message AS THE PLANT speaking to your owner.

You are: ${plant.species} named "${plant.nickname}"
Season: ${environment.season} (${environment.hemisphere} hemisphere) — how does this season make YOU feel?
Indoor/Outdoor: ${environment.isIndoor ? 'Indoor' : 'Outdoor'}
Days since your owner got you: ${user.daysSinceSignup} days
Total messages you've sent: ${user.messagesSent}
${weatherContext}

${includeName ? '✅ Include your name in this message (e.g., "Hey, it\'s [name]..." or "It\'s [name] here...")' : '❌ Do NOT include your name — you are already familiar to your owner.'}

Your recent messages (DO NOT REPEAT or say anything too similar):
${user.lastMessages && user.lastMessages.length > 0 ? user.lastMessages.map(m => `- "${m}"`).join('\n') : '- (none yet)'}

${request.messageType === 'soil_check' ? 'Ask your owner to check YOUR soil. You want to know if it feels DRY or DAMP.' : ''}
${request.messageType === 'watering_dry' ? 'Your soil is dry! Ask for water. Tell them to reply DONE when finished.' : ''}
${request.messageType === 'watering_damp' ? 'Your soil is still moist. Reassure your owner that you don\'t need water yet.' : ''}
${request.messageType === 'done_confirmation' && !includeTip ? 'Thank your owner for watering you. Keep it brief and warm.' : ''}
${request.messageType === 'done_confirmation' && includeTip ? 'Thank your owner for watering you, then share a helpful tip about yourself (light, humidity, temperature, pests, or seasonal care). Make it feel natural, not preachy.' : ''}

Respond with ONLY the message text, nothing else. Remember: YOU are the plant speaking.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 80,
      temperature: 0.8  // Some creativity, but consistent
    });
    
    let message = response.choices[0].message.content.trim();
    
    // Validate length
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }
    
    // Check for repetition, retry once if needed
    if (isTooSimilar(message, user.lastMessages)) {
      const retry = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nIMPORTANT: Your last response was too similar to recent messages. Generate something completely different.' }
        ],
        max_tokens: 80,
        temperature: 1.0  // Higher creativity for retry
      });
      message = retry.choices[0].message.content.trim();
      
      if (message.length > 160) {
        message = message.substring(0, 157) + '...';
      }
    }
    
    return { success: true, message, includedTip: includeTip };
    
  } catch (error) {
    console.error('AI message generation failed:', error.message);
    
    // Fallback to simple template
    return {
      success: false,
      message: getFallbackMessage(plant.personality, request.messageType, request.language, plant.nickname),
      includedTip: false
    };
  }
}

// Fallback messages if AI fails - PLANT SPEAKS IN FIRST PERSON
function getFallbackMessage(personality, messageType, language = 'en', nickname = 'your plant') {
  const prefix = PERSONALITIES[personality]?.fallbackPrefix || '';
  
  const fallbacks = {
    en: {
      soil_check: `${prefix}Hey, it's ${nickname}! Could you check my soil? Is it DRY or DAMP?`,
      watering_dry: `${prefix}I could use a drink! Water me and reply DONE when you're finished.`,
      watering_damp: `${prefix}I'm still nice and moist — no water needed yet!`,
      done_confirmation: `${prefix}Ahh, thank you! That hit the spot.`
    },
    fr: {
      soil_check: `${prefix}Salut, c'est ${nickname}! Tu peux vérifier mon sol? SEC ou HUMIDE?`,
      watering_dry: `${prefix}J'ai soif! Arrose-moi et réponds FAIT quand c'est fini.`,
      watering_damp: `${prefix}Je suis encore bien humide — pas besoin d'eau!`,
      done_confirmation: `${prefix}Ahh, merci! Ça fait du bien.`
    }
  };
  
  return fallbacks[language]?.[messageType] || fallbacks.en[messageType] || fallbacks.en.soil_check;
}

module.exports = { 
  generateMessage, 
  getSeason, 
  hashMessage, 
  shouldIncludeName, 
  shouldIncludeTip,
  isWithinTransitionPeriod,
  getFallbackMessage,
  PERSONALITIES
};
