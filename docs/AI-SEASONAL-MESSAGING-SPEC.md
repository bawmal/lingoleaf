# AI-Powered Seasonal Messaging Specification

## Overview

Replace static message templates with intelligent, AI-generated messages that adapt to:
- Season and weather conditions
- User journey stage (new vs. experienced)
- Message history (no repetition)
- Plant personality (consistent tone)

---

## 1. Database Schema Changes

### New Fields in `plants` Table

```sql
ALTER TABLE plants ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS last_messages TEXT[] DEFAULT '{}';
ALTER TABLE plants ADD COLUMN IF NOT EXISTS last_tip_sent_at TIMESTAMPTZ;
```

| Field | Type | Purpose |
|-------|------|---------|
| `messages_sent` | INTEGER | Total messages sent to this user/plant |
| `last_messages` | TEXT[] | Last 3 message hashes (for deduplication) |
| `last_tip_sent_at` | TIMESTAMPTZ | Track bi-weekly educational tips |

---

## 2. Message Types

| Type | Trigger | AI Generates |
|------|---------|--------------|
| `soil_check` | Scheduled reminder | Prompt to check soil |
| `watering_dry` | User replies DRY | Instruction to water |
| `watering_damp` | User replies DAMP | Confirmation, reschedule |
| `done_confirmation` | User replies DONE | Thank you + seasonal tip |
| `educational_tip` | Bi-weekly cron | Care tip (not watering related) |

---

## 3. Context Object

Passed to AI for every message generation:

```javascript
const messageContext = {
  // Plant info
  plant: {
    species: "Money Tree",
    nickname: "Monty",
    personality: "zen",           // zen | sassy | anxious | formal
    light_exposure: "indoor-bright",
    pot_size: "medium",
    location: "indoor"
  },
  
  // User journey
  user: {
    daysSinceSignup: 45,
    messagesSent: 12,
    lastMessages: [
      "Your plant is resting well this winter.",
      "Nicely done. Less water needed during dormancy."
    ],
    isPaidUser: false
  },
  
  // Environmental
  environment: {
    season: "winter",
    hemisphere: "northern",
    currentTemp: 2,               // Celsius
    weatherCondition: "cloudy",
    isIndoor: true
  },
  
  // Message request
  request: {
    messageType: "done_confirmation",
    language: "en"
  }
};
```

---

## 4. Name Usage Rules

The plant should NOT say its name in every message — that feels robotic.

| Condition | Include Name? |
|-----------|---------------|
| First message ever | ✅ Yes — introduction |
| First message after 7+ days gap | ✅ Yes — re-introduction |
| Every 4th message (roughly) | ✅ Yes — occasional reminder |
| All other messages | ❌ No — familiar tone |

**Implementation:**
```javascript
function shouldIncludeName(plant) {
  const isFirstMessage = plant.messages_sent === 0;
  const daysSinceLastMessage = (Date.now() - plant.last_message_at) / 86400000;
  const isLongGap = daysSinceLastMessage >= 7;
  const isNthMessage = plant.messages_sent % 4 === 0; // Every 4th
  
  return isFirstMessage || isLongGap || isNthMessage;
}
```

Add to prompt: `${shouldIncludeName(plant) ? 'Include your name in this message.' : 'Do NOT include your name — you are already familiar.'}`

---

## 5. Educational Tips (Smart Timing)

**No hardcoded schedule.** Tips are sandwiched into DONE confirmations when conditions are right.

### Tip Eligibility Logic

```javascript
function shouldIncludeTip(plant) {
  const wateringsSinceLastTip = plant.waterings_since_tip || 0;
  const isNewUserMilestone = plant.total_waterings === 3; // 3rd watering = teach time
  const isSeasonTransition = isWithinTransitionPeriod(plant.lat);
  
  // Include tip if ANY of these are true:
  return (
    wateringsSinceLastTip >= 5 ||      // 5+ waterings since last tip
    isNewUserMilestone ||               // New user's 3rd watering
    isSeasonTransition                  // Season is about to change
  );
}

function isWithinTransitionPeriod(lat) {
  const month = new Date().getMonth(); // 0-11
  // Transition periods: late Feb-Mar, late May-Jun, late Aug-Sep, late Nov-Dec
  const transitionMonths = [1, 2, 4, 5, 7, 8, 10, 11];
  return transitionMonths.includes(month);
}
```

### Database Field
```sql
ALTER TABLE plants ADD COLUMN IF NOT EXISTS waterings_since_tip INTEGER DEFAULT 0;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS total_waterings INTEGER DEFAULT 0;
```

### After Sending Tip
```javascript
// Reset counter after tip is included
if (includedTip) {
  await updatePlant(plant.id, { waterings_since_tip: 0 });
} else {
  await updatePlant(plant.id, { waterings_since_tip: (plant.waterings_since_tip || 0) + 1 });
}
```

### Tip Topics (AI chooses based on context)
- Light preferences
- Humidity needs
- Temperature sensitivity
- Pest awareness
- Repotting signs
- Fertilizing (spring)
- Dormancy prep (autumn)
- Seasonal transitions

---

## Sample Message Sequences

### New User: First 5 Messages (Winter, Zen Personality)

**Plant:** Money Tree named "Monty"  
**Location:** Toronto, Canada (Northern hemisphere)  
**Season:** Winter (January)

---

**Message 1 (Day 1) - Soil Check**
> 🧘 Hey, it's Monty. I just got settled in my new home. Could you check my soil? Is it DRY or DAMP?

*✅ Name included (first message)*

---

**Message 2 (Day 1) - User replied "DRY"**
> 🧘 I could use a gentle drink. Winter makes me sleepy, so just a little please. Reply DONE when you're finished.

*❌ No name (just responded)*

---

**Message 3 (Day 1) - User replied "DONE"**
> 🧘 Ahh, that feels better. I'll be resting quietly this winter — we'll talk again soon.

*❌ No name, ❌ No tip (too early — only 1st watering)*

---

**Message 4 (Day 8) - Soil Check**
> 🧘 Hello again. Mind checking if my soil is DRY or DAMP?

*❌ No name (4th message, but not divisible by 4 yet)*

---

**Message 5 (Day 8) - User replied "DRY" → Watered → "DONE"**
> 🧘 Thank you. By the way — I love bright indirect light, but keep me away from cold drafts. They stress me out this time of year.

*❌ No name, ✅ Tip included (3rd watering milestone)*

---

### Experienced User: Late Winter → Spring Transition

**Same plant, 2 months later (late February)**  
**Season:** Still winter, but spring approaching

---

**Message 12 (Late Feb) - Soil Check**
> 🧘 It's Monty. I'm starting to feel spring energy stirring. Could you check my soil? DRY or DAMP?

*✅ Name included (12th message, divisible by 4) + seasonal transition awareness*

---

**Message 13 (Late Feb) - User replied "DRY" → Watered → "DONE"**
> 🧘 Perfect timing. Spring is coming — I'll be thirstier soon. Maybe consider some light fertilizer when it warms up.

*❌ No name, ✅ Tip included (season transition period)*

---

**Message 14 (Early March) - Soil Check**
> 🧘 Good morning! Growth season is starting. How does my soil feel? DRY or DAMP?

*❌ No name (not due yet)*

---

**Message 15 (Early March) - User replied "DAMP"**
> 🧘 Still cozy in here. No water needed — but I'm waking up, so check back a bit sooner than usual.

*❌ No name, behavioral hint about changing frequency*

---

**Message 16 (Mid March) - Soil Check**
> 🧘 Hey, it's Monty! Spring is here and I'm feeling alive. Is my soil DRY or DAMP?

*✅ Name included (16th message, divisible by 4) + seasonal excitement*

---

## 7. AI Prompt Template

**CRITICAL: The plant speaks in first person. The plant IS the personality.**

```javascript
const systemPrompt = `You ARE a ${species} plant named "${nickname}" with a ${personality} personality. You speak in FIRST PERSON to your owner.

YOU ARE THE PLANT. You talk about yourself, your soil, your needs. The owner is caring for YOU.

PERSONALITY GUIDELINES:
- zen: Calm, mindful, peaceful. Use 🧘 emoji. Speak gently and with gratitude. You find peace in stillness.
- sassy: Playful, confident, a bit dramatic. Use 😎💅✨ emojis. You're the main character. Treat your owner like your bestie.
- anxious: Nervous, apologetic, worried. Use 😰😬🥹 emojis. You overthink everything. You don't want to be a burden.
- formal: Professional, dignified, matter-of-fact. No emojis. You're a distinguished plant with standards.

VOICE EXAMPLES:
- zen: "Hey, it's ${nickname}. I'm feeling peaceful today. Could you check my soil?"
- sassy: "Heyyy it's ${nickname}! I might need some water but like, no pressure... jk yes pressure 💅"
- anxious: "Hi... it's ${nickname}. Sorry to bother you but... I think my soil might be dry? Maybe?"
- formal: "This is ${nickname}. Soil moisture check requested. Please respond DRY or DAMP."

RULES:
1. Keep messages under 140 characters (SMS limit)
2. ALWAYS speak as the plant in first person ("I", "my", "me")
3. Never repeat phrases from recent messages
4. Match the personality tone exactly
5. Include seasonal context naturally (how YOU the plant feel in this season)
6. For new users (< 7 days): Introduce yourself, be welcoming
7. For experienced users (> 30 days): Be familiar, like an old friend
8. Always end with clear action if needed (DRY/DAMP/DONE)`;

const userPrompt = `Generate a ${messageType} message AS THE PLANT speaking to the owner.

You are: ${species} named "${nickname}" with ${personality} personality
Season: ${season} (${hemisphere} hemisphere) — how does this season make YOU feel?
Days since owner got you: ${daysSinceSignup} days
Total messages you've sent: ${messagesSent}

Your recent messages (DO NOT REPEAT or say anything too similar):
${lastMessages.map(m => `- "${m}"`).join('\n')}

${messageType === 'soil_check' ? 'Ask your owner to check YOUR soil. You want to know if it feels DRY or DAMP.' : ''}
${messageType === 'watering_dry' ? 'Your soil is dry! Ask for water. Tell them to reply DONE when finished.' : ''}
${messageType === 'watering_damp' ? 'Your soil is still moist. Reassure your owner that you don\'t need water yet.' : ''}
${messageType === 'done_confirmation' ? 'Thank your owner for watering you. Share how you feel about this season.' : ''}
${messageType === 'educational_tip' ? 'Share something about yourself — your preferences for light, humidity, or care. NOT about watering.' : ''}

Respond with ONLY the message text, nothing else. Remember: YOU are the plant speaking.`;
```

---

## 5. Implementation: `generateMessage.js`

```javascript
// netlify/functions/lib/generateMessage.js
const OpenAI = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Season detection
function getSeason(lat, date = new Date()) {
  const month = date.getMonth(); // 0-11
  const isNorthern = lat >= 0;
  
  if (month >= 2 && month <= 4) return isNorthern ? 'spring' : 'autumn';
  if (month >= 5 && month <= 7) return isNorthern ? 'summer' : 'winter';
  if (month >= 8 && month <= 10) return isNorthern ? 'autumn' : 'spring';
  return isNorthern ? 'winter' : 'summer';
}

// Hash message for deduplication
function hashMessage(msg) {
  return crypto.createHash('md5').update(msg).digest('hex').substring(0, 8);
}

// Check if message is too similar to recent ones
function isTooSimilar(newMsg, recentMessages) {
  const newHash = hashMessage(newMsg);
  return recentMessages.some(m => hashMessage(m) === newHash);
}

// Main generation function
async function generateMessage(context) {
  const { plant, user, environment, request } = context;
  const personality = PERSONALITIES[plant.personality] || PERSONALITIES.formal;
  
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

  const userPrompt = `Generate a ${request.messageType} message AS THE PLANT speaking to your owner.

You are: ${plant.species} named "${plant.nickname}"
Season: ${environment.season} (${environment.hemisphere} hemisphere) — how does this season make YOU feel?
Indoor/Outdoor: ${environment.isIndoor ? 'Indoor' : 'Outdoor'}
Days since your owner got you: ${user.daysSinceSignup} days
Total messages you've sent: ${user.messagesSent}

${request.includeName ? '✅ Include your name in this message (e.g., "Hey, it\'s [name]..." or "It\'s [name] here...")' : '❌ Do NOT include your name — you are already familiar to your owner.'}

Your recent messages (DO NOT REPEAT or say anything too similar):
${user.lastMessages.map(m => `- "${m}"`).join('\n') || '- (none yet)'}

${request.messageType === 'soil_check' ? 'Ask your owner to check YOUR soil. You want to know if it feels DRY or DAMP.' : ''}
${request.messageType === 'watering_dry' ? 'Your soil is dry! Ask for water. Tell them to reply DONE when finished.' : ''}
${request.messageType === 'watering_damp' ? 'Your soil is still moist. Reassure your owner that you don\'t need water yet.' : ''}
${request.messageType === 'done_confirmation' && !request.includeTip ? 'Thank your owner for watering you. Keep it brief and warm.' : ''}
${request.messageType === 'done_confirmation' && request.includeTip ? 'Thank your owner for watering you, then share a helpful tip about yourself (light, humidity, temperature, pests, or seasonal care). Make it feel natural, not preachy.' : ''}

Respond with ONLY the message text, nothing else. Remember: YOU are the plant speaking.`;

  try {
    const response = await openai.chat.completions.create({
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
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nIMPORTANT: Your last response was too similar. Generate something completely different.' }
        ],
        max_tokens: 80,
        temperature: 1.0  // Higher creativity for retry
      });
      message = retry.choices[0].message.content.trim();
    }
    
    return { success: true, message };
    
  } catch (error) {
    console.error('AI message generation failed:', error.message);
    
    // Fallback to simple template
    return {
      success: false,
      message: getFallbackMessage(plant.personality, request.messageType, request.language)
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
      done_confirmation: `${prefix}Ahh, thank you! That hit the spot.`,
      educational_tip: `${prefix}Hey! Did you know I like being rotated weekly for even growth?`
    },
    fr: {
      soil_check: `${prefix}Salut, c'est ${nickname}! Tu peux vérifier mon sol? SEC ou HUMIDE?`,
      watering_dry: `${prefix}J'ai soif! Arrose-moi et réponds FAIT quand c'est fini.`,
      watering_damp: `${prefix}Je suis encore bien humide — pas besoin d'eau!`,
      done_confirmation: `${prefix}Ahh, merci! Ça fait du bien.`,
      educational_tip: `${prefix}Hé! Tu savais que j'aime être tourné chaque semaine?`
    }
  };
  
  return fallbacks[language]?.[messageType] || fallbacks.en[messageType];
}

module.exports = { generateMessage, getSeason, hashMessage };
```

---

## 6. Integration Points

### A. `schedule-check.js` (Outbound reminders)

```javascript
// Replace static personaMessage() call with:
const { generateMessage, getSeason } = require('./lib/generateMessage');

const context = {
  plant: {
    species: p.species,
    nickname: p.nickname,
    personality: p.personality,
    light_exposure: p.light_exposure,
    location: p.location
  },
  user: {
    daysSinceSignup: Math.floor((Date.now() - new Date(p.created_at)) / 86400000),
    messagesSent: p.messages_sent || 0,
    lastMessages: p.last_messages || []
  },
  environment: {
    season: getSeason(p.lat),
    hemisphere: p.lat >= 0 ? 'northern' : 'southern',
    isIndoor: p.light_exposure?.startsWith('indoor')
  },
  request: {
    messageType: p.skip_soil_check ? 'watering_dry' : 'soil_check',
    language: p.language || 'en'
  }
};

const { message } = await generateMessage(context);
```

### B. `sms-webhook.js` (Response handling)

```javascript
// On DRY reply:
const { message } = await generateMessage({
  ...context,
  request: { messageType: 'watering_dry', language: p.language }
});

// On DAMP reply:
const { message } = await generateMessage({
  ...context,
  request: { messageType: 'watering_damp', language: p.language }
});

// On DONE reply:
const { message } = await generateMessage({
  ...context,
  request: { messageType: 'done_confirmation', language: p.language }
});
```

### C. Update message history after sending

```javascript
// After successful SMS send:
await updatePlant(p.id, {
  messages_sent: (p.messages_sent || 0) + 1,
  last_messages: [message, ...(p.last_messages || [])].slice(0, 3)
});
```

---

---

## 8. Cost Estimation

| Model | Cost per 1K tokens | Avg tokens/message | Cost per message |
|-------|-------------------|-------------------|------------------|
| gpt-4o-mini | $0.00015 input, $0.0006 output | ~200 input, ~40 output | ~$0.00005 |

**Monthly cost for 1,000 active plants:**
- 4 messages/week × 4 weeks = 16 messages/plant
- 16,000 messages × $0.00005 = **$0.80/month**

---

## 9. Guardrails

| Risk | Mitigation |
|------|------------|
| AI generates inappropriate content | Fallback to safe templates |
| Message too long | Truncate to 157 chars + "..." |
| Repetition | Hash comparison + retry |
| API failure | Graceful fallback |
| High latency | Async generation, don't block |
| Cost spike | Rate limit per user |

---

## 10. Testing Plan

1. **Unit tests** for `generateMessage()` with mocked OpenAI
2. **Integration tests** for each message type
3. **Personality consistency** - generate 10 messages per personality, verify tone
4. **Repetition test** - generate 20 messages, verify no duplicates
5. **Fallback test** - simulate API failure, verify fallback works

---

## 11. Rollout Plan

| Phase | Scope | Duration |
|-------|-------|----------|
| 1 | Internal testing with test plants | 1 week |
| 2 | 10% of users (A/B test) | 2 weeks |
| 3 | Full rollout | - |

Track in Amplitude:
- `AI Message Generated` (success/fallback)
- `Message Engagement` (response rate by AI vs. static)

---

## Summary

This spec enables:
- ✅ Non-repetitive, contextual messages
- ✅ Fatigue-aware (adapts to user journey)
- ✅ Seasonal relevance
- ✅ Personality consistency
- ✅ Bi-weekly educational tips
- ✅ Graceful fallbacks
- ✅ Cost-effective (~$0.80/month for 1K users)
