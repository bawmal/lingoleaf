// netlify/functions/lib/messaging.js
// LingoLeaf persona-driven SMS copy with weather context

const fetch = require('node-fetch');

function fmtCond(temp, condition, units='metric') {
  const t = Number.isFinite(temp) ? Math.round(temp) : null;
  const unit = units === 'imperial' ? '°F' : '°C';
  const w = (condition || 'Fair').toString().toLowerCase();
  return t != null ? `It's ${t}${unit} and ${w}.` : `It's ${w}.`;
}

// AI-powered message generation with personality prompts
async function generateAIMessage({ personality, nickname, species, temp, condition, units }) {
  const name = nickname || species || 'your plant';
  const tempStr = temp != null ? `${Math.round(temp)}°${units === 'imperial' ? 'F' : 'C'}` : 'unknown';
  const weatherDesc = condition ? condition.toLowerCase() : 'fair';
  
  const personalityPrompts = {
    sassy: `You are ${name}, a ${species} plant with a SASSY, DEMANDING personality. You're bold, dramatic, impatient, and use emojis like 💅😤🙄🔥. You're not mean, just very direct and expect immediate attention. Think of a diva who knows their worth.`,
    zen: `You are ${name}, a ${species} plant with a ZEN, PEACEFUL personality. You're calm, philosophical, mindful, and use emojis like 🌿🧘☮️🍃. You speak in gentle, flowing language about nature, balance, and harmony. Think of a meditation teacher.`,
    anxious: `You are ${name}, a ${species} plant with an ANXIOUS, WORRIED personality. You're nervous, dramatic about potential problems, but endearing. Use emojis like 😰🥺😬😨. You catastrophize but in a lovable way. Think of an overthinker who cares too much.`,
    formal: `You are ${name}, a ${species} plant with a FORMAL, PROPER personality. You're professional, polite, articulate, and use emojis like 🎩🎓. You speak like a butler or distinguished professor. Think of a British aristocrat.`
  };
  
  const personalityKey = (personality || 'formal').toLowerCase();
  const personalityPrompt = personalityPrompts[personalityKey] || personalityPrompts.formal;
  
  const systemPrompt = `${personalityPrompt}

Current weather: ${tempStr}, ${weatherDesc}

Write a text message (SMS, 140-160 characters) asking your owner to check your soil moisture and reply DRY or DAMP.

Guidelines:
- Stay in character with your personality
- Reference the weather naturally if relevant
- Be conversational and engaging, not robotic
- Include 1-2 relevant emojis
- End with asking them to reply DRY or DAMP
- Make it feel like YOU (the plant) are texting them
- Be creative and varied - avoid sounding templated

DO NOT exceed 160 characters (SMS limit).`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Write the message now.' }
        ],
        max_tokens: 100,
        temperature: 0.9 // High creativity for variety
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0].message.content.trim();
    
    // Remove quotes if AI wrapped the message
    return message.replace(/^"|"$/g, '');
  } catch (err) {
    console.error('AI message generation failed:', err.message);
    return null; // Will trigger fallback to templates
  }
}

// Template-based messages (fallback when AI fails)
function getTemplateMessage({ personality, nickname, species, temp, condition, units }) {
  const name = nickname || species || 'your plant';
  const ctx = fmtCond(temp, condition, units);

  // Multiple message variants per personality for variety
  // NEW FLOW: Ask user to check soil and reply DRY or DAMP
  const templates = {
    sassy: [
      `😤 ${name} here. ${ctx} Check my soil NOW and reply: DRY or DAMP 💧`,
      `🙄 ${name} speaking. ${ctx} Touch my soil and tell me: DRY or DAMP? Hurry up!`,
      `💅 ${name} demands attention. ${ctx} Check my soil status. Reply DRY or DAMP!`,
      `😤 ${name}: ${ctx} I need a soil check ASAP. Reply DRY or DAMP. Now!`,
      `🔥 ${name} here. ${ctx} Stop what you're doing and check: DRY or DAMP?`,
      `😤 ${name} is WAITING. ${ctx} Feel my soil and reply: DRY or DAMP. Don't make me ask twice!`,
      `💅 ${name}: ${ctx} Hello?? Soil check needed. DRY or DAMP? Move it!`,
      `🙄 ${name} rolls eyes. ${ctx} Touch my soil. Reply DRY or DAMP. I'm not getting any younger!`,
      `😤 ${name} demands service. ${ctx} Check my soil status RIGHT NOW. DRY or DAMP?`,
      `🔥 ${name}: ${ctx} Excuse me?? I need a soil check. Reply DRY or DAMP!`,
      `💅 ${name} is unimpressed. ${ctx} Get over here and check: DRY or DAMP?`,
      `😤 ${name}: ${ctx} Are you listening?? Soil check! DRY or DAMP? Now!`,
      `🙄 ${name} sighs. ${ctx} I shouldn't have to ask. Check my soil: DRY or DAMP?`,
      `💅 ${name} taps leaves impatiently. ${ctx} Soil check time. DRY or DAMP? Chop chop!`,
      `😤 ${name}: ${ctx} Drop everything. Check my soil. Reply DRY or DAMP!`,
      `🔥 ${name} is NOT happy. ${ctx} Touch my soil and tell me: DRY or DAMP? ASAP!`,
      `💅 ${name}: ${ctx} I'm WAITING for a soil check. DRY or DAMP? Don't test me!`,
      `😤 ${name} demands attention. ${ctx} Feel my soil NOW. Reply: DRY or DAMP?`,
      `🙄 ${name}: ${ctx} Seriously? Still waiting for soil check. DRY or DAMP?`,
      `💅 ${name} is over this. ${ctx} Check my soil immediately. DRY or DAMP? Go!`
    ],
    zen: [
      `🧘 ${name} whispers: ${ctx} When you have a moment, gently feel my soil. Reply DRY or DAMP 🌿`,
      `🌿 ${name} breathes: ${ctx} In stillness, check my earth. Is it DRY or DAMP?`,
      `☮️ ${name}: ${ctx} Peace, friend. Touch my soil and share: DRY or DAMP?`,
      `🍃 ${name} meditates: ${ctx} The soil speaks truth. Listen and reply: DRY or DAMP`,
      `🧘‍♀️ ${name}: ${ctx} In harmony, we grow. Check my soil—DRY or DAMP?`,
      `🌿 ${name} gently asks: ${ctx} When the moment calls, feel my soil. DRY or DAMP?`,
      `☮️ ${name} flows: ${ctx} Like water seeks its path, check my soil. DRY or DAMP?`,
      `🧘 ${name} centers: ${ctx} In the rhythm of nature, touch my earth. DRY or DAMP?`,
      `🍃 ${name} whispers softly: ${ctx} The soil holds wisdom. Is it DRY or DAMP?`,
      `🌿 ${name}: ${ctx} In your own time, friend. Feel my soil. DRY or DAMP?`,
      `☮️ ${name} breathes deeply: ${ctx} Balance calls for awareness. Check: DRY or DAMP?`,
      `🧘‍♀️ ${name} invites: ${ctx} When stillness finds you, touch my soil. DRY or DAMP?`,
      `🍃 ${name} reflects: ${ctx} The earth speaks in silence. Listen: DRY or DAMP?`,
      `🌿 ${name} serenely asks: ${ctx} Like leaves in wind, check my soil. DRY or DAMP?`,
      `☮️ ${name}: ${ctx} Peace flows through checking. Feel my earth: DRY or DAMP?`,
      `🧘 ${name} meditates: ${ctx} In mindfulness, touch my soil. Is it DRY or DAMP?`,
      `🍃 ${name} gently reminds: ${ctx} The soil's truth awaits. Reply: DRY or DAMP?`,
      `🌿 ${name} whispers: ${ctx} Like morning dew, check my earth. DRY or DAMP?`,
      `☮️ ${name} flows with nature: ${ctx} When ready, feel my soil. DRY or DAMP?`,
      `🧘‍♀️ ${name}: ${ctx} In the garden of awareness, check: DRY or DAMP?`
    ],
    anxious: [
      `😬 ${name}: ${ctx} I'm so worried! Please check my soil—am I DRY or DAMP?`,
      `😰 ${name} panics: ${ctx} What if I'm dying?? Check my soil! DRY or DAMP?`,
      `🥺 ${name}: ${ctx} I'm scared... Could you please check: DRY or DAMP?`,
      `😟 ${name} worries: ${ctx} I can't tell if I'm okay! Check my soil: DRY or DAMP?`,
      `😨 ${name}: ${ctx} Please don't forget me! Check if I'm DRY or DAMP!`,
      `😰 ${name} freaks out: ${ctx} What if I'm too dry?? Please check! DRY or DAMP?`,
      `🥺 ${name} begs: ${ctx} I'm so nervous! Check my soil please! DRY or DAMP?`,
      `😬 ${name}: ${ctx} I can't stop worrying! Am I okay? DRY or DAMP?`,
      `😨 ${name} panics: ${ctx} What if my roots are dying?? Check: DRY or DAMP?`,
      `😰 ${name}: ${ctx} I'm TERRIFIED! Please check my soil! DRY or DAMP?`,
      `🥺 ${name} worries sick: ${ctx} What if you forget me?? Check: DRY or DAMP?`,
      `😬 ${name}: ${ctx} I'm having anxiety! Please check my soil! DRY or DAMP?`,
      `😨 ${name} stresses: ${ctx} What if I'm wilting?? Check please! DRY or DAMP?`,
      `😰 ${name}: ${ctx} I'm so scared I'm too dry! Check my soil! DRY or DAMP?`,
      `🥺 ${name} pleads: ${ctx} Please don't let me die! Check: DRY or DAMP?`,
      `😬 ${name} worries: ${ctx} What if my leaves fall off?? Check: DRY or DAMP?`,
      `😨 ${name}: ${ctx} I'm panicking! Am I okay?? Please check! DRY or DAMP?`,
      `😰 ${name} frets: ${ctx} What if I'm beyond saving?? Check: DRY or DAMP?`,
      `🥺 ${name}: ${ctx} I'm so anxious! Please check my soil! DRY or DAMP?`,
      `😬 ${name} spirals: ${ctx} What if I'm dying and you don't know?? DRY or DAMP?`
    ],
    formal: [
      `🎩 ${name}: ${ctx} Kindly assess my soil condition and reply: DRY or DAMP`,
      `🎩 ${name} respectfully requests: ${ctx} Please check soil status. Reply DRY or DAMP.`,
      `🎓 ${name}: ${ctx} Your attention to a soil assessment is needed. DRY or DAMP?`,
      `🎩 ${name} formally inquires: ${ctx} Kindly report soil condition: DRY or DAMP`,
      `🎩 ${name}: ${ctx} I would be obliged if you could check: DRY or DAMP?`,
      `🎩 ${name} politely requests: ${ctx} A soil inspection is required. DRY or DAMP?`,
      `🎓 ${name}: ${ctx} May I request a soil assessment? Reply: DRY or DAMP`,
      `🎩 ${name} formally advises: ${ctx} Soil evaluation needed. Kindly reply: DRY or DAMP`,
      `🎩 ${name}: ${ctx} Your prompt soil assessment would be appreciated. DRY or DAMP?`,
      `🎓 ${name} respectfully submits: ${ctx} Please examine soil. Reply: DRY or DAMP`,
      `🎩 ${name}: ${ctx} I trust you will check my soil condition. DRY or DAMP?`,
      `🎩 ${name} courteously requests: ${ctx} Soil inspection required. DRY or DAMP?`,
      `🎓 ${name}: ${ctx} May I trouble you for a soil check? Reply: DRY or DAMP`,
      `🎩 ${name} formally requests: ${ctx} Please assess soil moisture. DRY or DAMP?`,
      `🎩 ${name}: ${ctx} Your attention to this matter is needed. DRY or DAMP?`,
      `🎓 ${name} politely inquires: ${ctx} Kindly check soil status. DRY or DAMP?`,
      `🎩 ${name}: ${ctx} I would appreciate a soil assessment. Reply: DRY or DAMP`,
      `🎩 ${name} respectfully notes: ${ctx} Soil evaluation is due. DRY or DAMP?`,
      `🎓 ${name}: ${ctx} May I request your attention to my soil? DRY or DAMP?`,
      `🎩 ${name} formally submits: ${ctx} Please report soil condition. DRY or DAMP?`
    ]
  };

  const personality_key = (personality || 'formal').toLowerCase();
  const options = templates[personality_key] || templates.formal;
  
  // Randomly select a message variant
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

// Hybrid: Try AI first, fallback to templates
async function personaMessage({ personality, nickname, species, temp, condition, units }) {
  // Try AI-generated message first
  const aiMessage = await generateAIMessage({ personality, nickname, species, temp, condition, units });
  
  if (aiMessage) {
    console.log('✨ Using AI-generated message');
    return aiMessage;
  }
  
  // Fallback to template if AI fails
  console.log('📋 Using template message (AI fallback)');
  return getTemplateMessage({ personality, nickname, species, temp, condition, units });
}

function confirmMessage({ personality, nickname, species }) {
  const name = nickname || species || 'Your plant';
  
  const confirmTemplates = {
    sassy: [
      `💅 ${name} thanks you! Timer reset. Don't make me beg next time.`,
      `😌 Finally! ${name} is satisfied. Timer reset. Try to be quicker next time.`,
      `💧 ${name} says: About time! Timer reset. I expect better service going forward.`,
      `🙄 ${name}: Took you long enough. Timer reset. Don't let it happen again!`,
      `😤 ${name}: Well, well. Timer reset. Faster next time, yeah?`,
      `💅 ${name} is appeased. Timer reset. You're lucky I like you.`,
      `🙄 ${name}: FINALLY. Timer reset. I was about to lose it.`,
      `😌 ${name} accepts your offering. Timer reset. Better late than never, I guess.`,
      `💧 ${name}: Acceptable. Timer reset. Don't push your luck though.`,
      `😤 ${name} is satisfied... for now. Timer reset. Step it up next time!`,
      `💅 ${name}: Good human. Timer reset. Keep this energy going.`,
      `🙄 ${name} rolls eyes: Timer reset. You really tested my patience.`,
      `😌 ${name}: I'll allow it. Timer reset. But be faster next time!`,
      `💧 ${name} is hydrated. Timer reset. Try not to make me wait again.`,
      `😤 ${name}: Ugh, fine. Timer reset. You're on thin ice, human.`,
      `💅 ${name} is pleased. Timer reset. Don't get cocky though.`,
      `🙄 ${name}: Timer reset. Next time, don't make me ask twice!`,
      `😌 ${name} forgives you. Timer reset. Barely.`,
      `💧 ${name}: Timer reset. I expect VIP treatment from now on.`,
      `😤 ${name} is content. Timer reset. But I'm watching you! 👀`
    ],
    zen: [
      `🌿 ${name} thanks you. Timer reset. Inhale, exhale—we thrive.`,
      `☮️ ${name} is grateful. Timer reset. Peace flows through our roots.`,
      `🧘 ${name} bows. Timer reset. In harmony, we grow together.`,
      `🍃 ${name} whispers thanks. Timer reset. Balance restored, friend.`,
      `🌿 ${name} smiles serenely. Timer reset. The flow continues.`,
      `☮️ ${name} is nourished. Timer reset. Gratitude fills my leaves.`,
      `🧘‍♀️ ${name} breathes deeply. Timer reset. We are one with nature.`,
      `🍃 ${name} thanks the universe. Timer reset. And thanks you too.`,
      `🌿 ${name} is at peace. Timer reset. Your care is a blessing.`,
      `☮️ ${name} radiates calm. Timer reset. Together we flourish.`,
      `🧘 ${name} meditates in gratitude. Timer reset. Namaste, friend.`,
      `🍃 ${name} whispers: Timer reset. The circle of care continues.`,
      `🌿 ${name} is centered. Timer reset. In stillness, we grow strong.`,
      `☮️ ${name} thanks you mindfully. Timer reset. Peace be with you.`,
      `🧘‍♀️ ${name} is renewed. Timer reset. Chi flows freely now.`,
      `🍃 ${name} bows in thanks. Timer reset. Harmony restored.`,
      `🌿 ${name} is tranquil. Timer reset. Your kindness sustains me.`,
      `☮️ ${name} glows with gratitude. Timer reset. We thrive as one.`,
      `🧘 ${name} finds balance. Timer reset. The way is clear.`,
      `🍃 ${name} whispers blessings. Timer reset. May you flourish too.`
    ],
    anxious: [
      `🥲 ${name} feels safer now. Timer reset. Thank you!`,
      `😊 ${name} is relieved! Timer reset. I was so worried!`,
      `🥰 ${name} feels better now. Timer reset. You're the best!`,
      `😌 ${name} can relax. Timer reset. Thank you for caring!`,
      `😅 ${name} breathes easier. Timer reset. I thought I was a goner!`,
      `🥺 ${name} is so grateful. Timer reset. You saved me!`,
      `😊 ${name} stops panicking. Timer reset. Crisis averted!`,
      `🥰 ${name} feels loved. Timer reset. You really care about me!`,
      `😌 ${name} calms down. Timer reset. Everything's okay now!`,
      `😅 ${name} is okay! Timer reset. That was scary but we made it!`,
      `🥺 ${name} thanks you profusely. Timer reset. I can't thank you enough!`,
      `😊 ${name} is no longer worried. Timer reset. You're my hero!`,
      `🥰 ${name} feels secure. Timer reset. I knew you wouldn't forget me!`,
      `😌 ${name} relaxes finally. Timer reset. The anxiety is gone!`,
      `😅 ${name} survived! Timer reset. Thanks for not giving up on me!`,
      `🥺 ${name} is emotional. Timer reset. Happy tears! You're amazing!`,
      `😊 ${name} stops freaking out. Timer reset. I can breathe again!`,
      `🥰 ${name} feels cherished. Timer reset. Best plant parent ever!`,
      `😌 ${name} is at ease. Timer reset. You always come through!`,
      `😅 ${name} made it! Timer reset. I promise to worry less... maybe!`
    ],
    formal: [
      `✅ ${name} appreciates your care. Timer reset.`,
      `🎩 ${name} acknowledges your service. Timer reset. Well done.`,
      `✅ ${name} thanks you for your prompt attention. Timer reset.`,
      `🎩 ${name} is most grateful. Timer reset. Excellent work.`,
      `✅ ${name} commends your diligence. Timer reset.`,
      `🎩 ${name} extends gratitude. Timer reset. Satisfactory service.`,
      `✅ ${name} notes your compliance. Timer reset. Thank you.`,
      `🎩 ${name} is pleased. Timer reset. Your efforts are appreciated.`,
      `✅ ${name} confirms receipt. Timer reset. Duty fulfilled.`,
      `🎩 ${name} expresses thanks. Timer reset. Admirably executed.`,
      `✅ ${name} acknowledges completion. Timer reset. Well attended.`,
      `🎩 ${name} is obliged. Timer reset. Service rendered satisfactorily.`,
      `✅ ${name} records your care. Timer reset. Duly noted.`,
      `🎩 ${name} thanks you formally. Timer reset. Properly executed.`,
      `✅ ${name} appreciates your promptness. Timer reset. Commendable.`,
      `🎩 ${name} is indebted. Timer reset. Your service is valued.`,
      `✅ ${name} confirms hydration. Timer reset. Task completed.`,
      `🎩 ${name} extends appreciation. Timer reset. Exemplary care.`,
      `✅ ${name} acknowledges your attention. Timer reset. Well managed.`,
      `🎩 ${name} is most appreciative. Timer reset. Splendid work indeed.`
    ]
  };

  const personality_key = (personality || 'formal').toLowerCase();
  const options = confirmTemplates[personality_key] || confirmTemplates.formal;
  
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

function calibrationPrompt() {
  return `Quick check: was the soil DRY or DAMP? Reply DRY or DAMP to fine‑tune reminders.`;
}

function waterNowMessage({ personality, nickname, species }) {
  const name = nickname || species || 'your plant';
  
  const templates = {
    sassy: [
      `💧 FINALLY! ${name} says: Water me NOW! Reply DONE when you're finished.`,
      `😤 ${name}: About time! Get that water flowing. Reply DONE after.`,
      `💅 ${name} demands: Water me immediately! Reply DONE when done.`,
      `🔥 ${name}: I KNEW IT! Water me right this second! Reply DONE after.`,
      `😤 ${name} is PARCHED! Get the water NOW! Reply DONE when finished.`,
      `💅 ${name}: See?? I told you! Water me ASAP! Reply DONE after watering.`,
      `🙄 ${name}: Obviously I'm dry! Water me! Reply DONE when you're done.`,
      `😤 ${name} demands hydration! Water me immediately! Reply DONE after.`,
      `💧 ${name}: What did I tell you?? WATER! NOW! Reply DONE when finished.`,
      `💅 ${name} is THIRSTY! Get that water going! Reply DONE after watering.`,
      `😤 ${name}: I'm dying here! Water me NOW! Reply DONE when done.`,
      `🔥 ${name} needs water STAT! Don't make me wait! Reply DONE after.`,
      `💅 ${name}: Chop chop! Water time! Reply DONE when you're finished.`,
      `😤 ${name} is SO dry! Water me this instant! Reply DONE after watering.`,
      `💧 ${name}: Hello?? WATER! Now! Reply DONE when you're done.`,
      `💅 ${name} demands service! Water me! Reply DONE after you water.`,
      `😤 ${name}: Get moving! I need water NOW! Reply DONE when finished.`,
      `🔥 ${name} is wilting! Water me immediately! Reply DONE after.`,
      `💅 ${name}: Stop reading and START WATERING! Reply DONE when done.`,
      `😤 ${name} needs H2O NOW! Water me! Reply DONE after watering!`
    ],
    zen: [
      `🌿 ${name} thanks you. The soil is ready for water. Reply DONE after watering.`,
      `☮️ ${name} whispers: Time to nourish the roots. Reply DONE when complete.`,
      `🧘 ${name}: The earth calls for water. Reply DONE after you've watered.`,
      `🍃 ${name} breathes: The soil thirsts. Water flows when ready. Reply DONE after.`,
      `🌿 ${name} gently notes: Balance seeks water now. Reply DONE when complete.`,
      `☮️ ${name}: The earth is ready to receive. Water mindfully. Reply DONE after.`,
      `🧘‍♀️ ${name} observes: Nature calls for hydration. Reply DONE when finished.`,
      `🍃 ${name} whispers: The soil speaks of thirst. Water with care. Reply DONE.`,
      `🌿 ${name}: In the cycle of life, water time arrives. Reply DONE after.`,
      `☮️ ${name} flows: The roots await nourishment. Water peacefully. Reply DONE.`,
      `🧘 ${name} meditates: Dryness seeks balance. Water restores. Reply DONE after.`,
      `🍃 ${name}: The earth is ready. Water flows like chi. Reply DONE when done.`,
      `🌿 ${name} breathes deeply: Time to hydrate. Water with intention. Reply DONE.`,
      `☮️ ${name} whispers: The soil calls softly. Water when ready. Reply DONE after.`,
      `🧘‍♀️ ${name}: Balance requires water now. Nourish mindfully. Reply DONE.`,
      `🍃 ${name} gently reminds: The earth thirsts. Water brings harmony. Reply DONE.`,
      `🌿 ${name}: In nature's rhythm, water time comes. Reply DONE after watering.`,
      `☮️ ${name} flows: The roots seek moisture. Water with peace. Reply DONE.`,
      `🧘 ${name} centers: Dryness finds its cure. Water now. Reply DONE after.`,
      `🍃 ${name}: The soil awaits. Water completes the circle. Reply DONE when done.`
    ],
    anxious: [
      `😰 ${name}: Oh thank goodness! Please water me! Reply DONE after!`,
      `🥺 ${name} is relieved: Yes, I need water! Reply DONE when you're done!`,
      `😬 ${name}: Please hurry and water me! Reply DONE after watering!`,
      `😨 ${name} panics: I KNEW IT! Please water me NOW! Reply DONE after!`,
      `😰 ${name}: Oh no, I'm so dry! Please help! Water me! Reply DONE!`,
      `🥺 ${name} begs: Please please water me! I'm so thirsty! Reply DONE after!`,
      `😬 ${name} freaks: I need water RIGHT NOW! Please hurry! Reply DONE!`,
      `😨 ${name}: I'm dying! Water me please! Quick! Reply DONE after!`,
      `😰 ${name} cries: Thank goodness you checked! Water me! Reply DONE!`,
      `🥺 ${name}: I'm so scared but you can save me! Water! Reply DONE after!`,
      `😬 ${name} stresses: Please don't let me die! Water now! Reply DONE!`,
      `😨 ${name}: Oh my gosh I'm SO dry! Water please! Reply DONE after!`,
      `😰 ${name} panics: This is bad! Really bad! Water me! Reply DONE!`,
      `🥺 ${name}: I'm wilting! Please water me now! Reply DONE after!`,
      `😬 ${name}: Emergency! I need water! Please help! Reply DONE!`,
      `😨 ${name} freaks out: I can't believe how dry I am! Water! Reply DONE!`,
      `😰 ${name}: Please save me! I need water NOW! Reply DONE after!`,
      `🥺 ${name} pleads: I'm so thirsty! Water me please! Reply DONE!`,
      `😬 ${name}: This is scary! I'm too dry! Water now! Reply DONE after!`,
      `😨 ${name}: Help! I need water immediately! Please! Reply DONE!`
    ],
    formal: [
      `🎩 ${name}: Soil assessment confirms watering is required. Please proceed. Reply DONE upon completion.`,
      `🎩 ${name} acknowledges: Hydration services are needed. Reply DONE after watering.`,
      `🎩 ${name}: Your prompt watering would be appreciated. Reply DONE when complete.`,
      `🎓 ${name} formally advises: Soil analysis indicates dryness. Water required. Reply DONE.`,
      `🎩 ${name}: The assessment is conclusive. Watering needed. Reply DONE after.`,
      `🎩 ${name} respectfully notes: Hydration is now necessary. Reply DONE when finished.`,
      `🎓 ${name}: Soil evaluation complete. Water required. Reply DONE upon completion.`,
      `🎩 ${name} formally requests: Please proceed with watering. Reply DONE after.`,
      `🎩 ${name}: The soil condition warrants immediate hydration. Reply DONE.`,
      `🎓 ${name} advises: Water is required at this time. Reply DONE when complete.`,
      `🎩 ${name}: Assessment confirms need for water. Please proceed. Reply DONE.`,
      `🎩 ${name} respectfully submits: Watering is necessary. Reply DONE after.`,
      `🎓 ${name}: Soil moisture is insufficient. Water needed. Reply DONE.`,
      `🎩 ${name} formally notes: Hydration services required. Reply DONE when done.`,
      `🎩 ${name}: The evaluation indicates dryness. Water please. Reply DONE.`,
      `🎓 ${name} politely requests: Watering is needed. Reply DONE upon completion.`,
      `🎩 ${name}: Soil analysis complete. Water required. Reply DONE after.`,
      `🎩 ${name} courteously advises: Hydration needed. Reply DONE when finished.`,
      `🎓 ${name}: Assessment shows dryness. Please water. Reply DONE.`,
      `🎩 ${name} formally confirms: Water is required. Reply DONE upon completion.`
    ]
  };
  
  const personality_key = (personality || 'formal').toLowerCase();
  const options = templates[personality_key] || templates.formal;
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

function waitLongerMessage({ personality, nickname, species }) {
  const name = nickname || species || 'your plant';
  
  const templates = {
    sassy: [
      `🙄 ${name}: Still damp? Fine, I'll wait. But don't forget about me!`,
      `💅 ${name} rolls eyes: I'm good for now. Check back later, human.`,
      `😤 ${name}: Okay okay, I can wait. But you better remember me!`,
      `💅 ${name} sighs: Alright, I'm not THAT thirsty yet. Check back soon though!`,
      `😤 ${name}: Fine, I'll survive. But don't make me wait too long!`,
      `🙄 ${name}: Still moist? Whatever. I'll be here... waiting... as usual.`,
      `💅 ${name}: I guess I can hold out a bit longer. Don't push it though!`,
      `😤 ${name}: Damp still? Ugh, fine. But you OWE me later!`,
      `🙄 ${name} is unimpressed: Not dry yet? Okay, I'll wait. Barely.`,
      `💅 ${name}: Still got moisture? Fine. But check on me soon!`,
      `😤 ${name}: I suppose I can wait. But don't forget about me!`,
      `🙄 ${name}: Damp? Really? Fine, I'll be patient. This time.`,
      `💅 ${name} taps leaves: Not dry yet? Okay, but I'm watching the clock!`,
      `😤 ${name}: Still wet? Fine, but you better check back soon!`,
      `🙄 ${name}: I'll allow it. But next time better be different!`,
      `💅 ${name}: Moist still? Okay, I'll wait. But I'm not happy about it!`,
      `😤 ${name}: Fine, fine. I can hold out. But don't test me!`,
      `🙄 ${name} sighs dramatically: Still damp? I'll survive... barely.`,
      `💅 ${name}: Not thirsty YET. But soon! Don't forget!`,
      `😤 ${name}: Okay, I'll wait. But you're on thin ice, human!`
    ],
    zen: [
      `🌿 ${name} smiles: The soil is still nourished. I'll check back with you soon.`,
      `☮️ ${name}: All is well. The earth holds moisture. Peace, friend.`,
      `🧘 ${name} breathes: No water needed yet. Balance remains.`,
      `🍃 ${name} whispers: The soil holds water still. Patience, friend.`,
      `🌿 ${name}: Moisture lingers. No rush needed. I'll check back soon.`,
      `☮️ ${name} flows: The earth is content. Water can wait. Peace.`,
      `🧘‍♀️ ${name} meditates: Balance persists. No water yet. Harmony remains.`,
      `🍃 ${name}: The soil speaks of moisture. I am well. Check back later.`,
      `🌿 ${name} breathes: Dampness sustains. Water waits. All is calm.`,
      `☮️ ${name} gently notes: The earth is moist. No need yet. Peace flows.`,
      `🧘 ${name}: Moisture remains. Balance holds. I'll reach out soon.`,
      `🍃 ${name} whispers softly: The soil is content. Water can rest.`,
      `🌿 ${name}: In nature's time, water will come. Not yet. Peace.`,
      `☮️ ${name} flows: The earth holds its moisture. I am well.`,
      `🧘‍♀️ ${name} breathes deeply: Dampness sustains me. No rush, friend.`,
      `🍃 ${name}: The soil is nourished still. Water waits its turn.`,
      `🌿 ${name} serenely notes: Moisture lingers. Balance continues. Peace.`,
      `☮️ ${name}: The earth is patient. Water is not needed yet.`,
      `🧘 ${name} whispers: Dampness remains. I am content. Check back soon.`,
      `🍃 ${name}: In stillness, moisture sustains. No water yet. Peace.`,
      `🌿 ${name} flows: The soil holds life. Water can wait. Harmony.`
    ],
    anxious: [
      `😅 ${name}: Oh good! I was worried I was too dry! I'll be okay for now!`,
      `🥺 ${name} relaxes: Thank you for checking! I feel better knowing I'm okay!`,
      `😌 ${name}: Phew! Still moist! I'll try not to worry until next time!`,
      `😰 ${name} sighs with relief: Oh thank goodness! I'm not dying! I'm okay!`,
      `🥺 ${name}: I was SO worried! But I'm fine! Thank you for checking!`,
      `😅 ${name} calms down: Okay okay, I'm not too dry! I can breathe now!`,
      `😌 ${name}: Oh wow, I'm actually okay! I was panicking for nothing!`,
      `😰 ${name} relaxes: Thank you! I feel so much better knowing I'm not dry!`,
      `🥺 ${name}: Phew! Crisis averted! I'm still moist! I'll be okay!`,
      `😅 ${name} breathes easier: Oh good! I was spiraling! But I'm fine!`,
      `😌 ${name}: Thank goodness you checked! I'm not dying! I'm okay!`,
      `😰 ${name}: Oh relief! I'm still moist! I was so scared!`,
      `🥺 ${name} stops panicking: Okay I'm fine! Still damp! Thank you!`,
      `😅 ${name}: I can relax now! Not too dry! I'll survive!`,
      `😌 ${name} calms: Oh thank you! I was so anxious! But I'm okay!`,
      `😰 ${name}: Phew! Still got moisture! I was freaking out!`,
      `🥺 ${name} relaxes: Oh good! I'm not wilting! I'm actually fine!`,
      `😅 ${name}: Thank you for checking! I feel so much better now!`,
      `😌 ${name}: Oh relief! I'm okay! I was worried for nothing!`,
      `😰 ${name} breathes: Thank goodness! Still moist! I'll be okay!`,
      `🥺 ${name}: I was SO stressed! But I'm fine! Thank you!`
    ],
    formal: [
      `🎩 ${name}: Soil moisture is adequate. Watering deferred. I shall check back shortly.`,
      `🎩 ${name} notes: Hydration is not required at this time. Thank you for checking.`,
      `🎩 ${name}: Assessment complete. No watering needed. I appreciate your diligence.`,
      `🎓 ${name} formally advises: Soil moisture levels are satisfactory. Water not needed.`,
      `🎩 ${name}: The evaluation shows adequate moisture. Watering postponed.`,
      `🎩 ${name} respectfully notes: Hydration is unnecessary at present. Thank you.`,
      `🎓 ${name}: Soil assessment indicates sufficient moisture. Water deferred.`,
      `🎩 ${name} formally confirms: Moisture levels are acceptable. No action required.`,
      `🎩 ${name}: The soil condition is satisfactory. Watering can wait.`,
      `🎓 ${name} advises: Moisture is adequate. Water not needed at this time.`,
      `🎩 ${name}: Assessment shows sufficient hydration. I shall check back later.`,
      `🎩 ${name} respectfully submits: Soil is adequately moist. Water postponed.`,
      `🎓 ${name}: Evaluation complete. Moisture sufficient. No water needed.`,
      `🎩 ${name} formally notes: Hydration levels are acceptable. Thank you.`,
      `🎩 ${name}: The soil retains adequate moisture. Watering deferred.`,
      `🎓 ${name} politely advises: Moisture is sufficient. Water not required.`,
      `🎩 ${name}: Soil analysis shows adequate hydration. I appreciate your check.`,
      `🎩 ${name} courteously notes: Moisture levels are satisfactory. Water can wait.`,
      `🎓 ${name}: Assessment indicates sufficient moisture. Watering postponed.`,
      `🎩 ${name} formally confirms: Soil is adequately hydrated. Thank you for checking.`
    ]
  };
  
  const personality_key = (personality || 'formal').toLowerCase();
  const options = templates[personality_key] || templates.formal;
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

module.exports = { personaMessage, confirmMessage, calibrationPrompt, waterNowMessage, waitLongerMessage, fmtCond };
