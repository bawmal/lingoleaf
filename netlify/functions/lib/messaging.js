// netlify/functions/lib/messaging.js
// LingoLeaf persona-driven SMS copy with weather context

function fmtCond(temp, condition, units='metric') {
  const t = Number.isFinite(temp) ? Math.round(temp) : null;
  const unit = units === 'imperial' ? '°F' : '°C';
  const w = (condition || 'Fair').toString().toLowerCase();
  return t != null ? `It's ${t}${unit} and ${w}.` : `It's ${w}.`;
}

function personaMessage({ personality, nickname, species, temp, condition, units }) {
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
      `🧘‍♀️ ${name}: ${ctx} In harmony, we grow. Check my soil—DRY or DAMP?`
    ],
    anxious: [
      `😬 ${name}: ${ctx} I'm so worried! Please check my soil—am I DRY or DAMP?`,
      `😰 ${name} panics: ${ctx} What if I'm dying?? Check my soil! DRY or DAMP?`,
      `🥺 ${name}: ${ctx} I'm scared... Could you please check: DRY or DAMP?`,
      `😟 ${name} worries: ${ctx} I can't tell if I'm okay! Check my soil: DRY or DAMP?`,
      `😨 ${name}: ${ctx} Please don't forget me! Check if I'm DRY or DAMP!`
    ],
    formal: [
      `🎩 ${name}: ${ctx} Kindly assess my soil condition and reply: DRY or DAMP`,
      `🎩 ${name} respectfully requests: ${ctx} Please check soil status. Reply DRY or DAMP.`,
      `🎓 ${name}: ${ctx} Your attention to a soil assessment is needed. DRY or DAMP?`,
      `🎩 ${name} formally inquires: ${ctx} Kindly report soil condition: DRY or DAMP`,
      `🎩 ${name}: ${ctx} I would be obliged if you could check: DRY or DAMP?`
    ]
  };

  const personality_key = (personality || 'formal').toLowerCase();
  const options = templates[personality_key] || templates.formal;
  
  // Randomly select a message variant
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
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
      `🧘 ${name}: The earth calls for water. Reply DONE after you've watered.`
    ],
    anxious: [
      `😰 ${name}: Oh thank goodness! Please water me! Reply DONE after!`,
      `🥺 ${name} is relieved: Yes, I need water! Reply DONE when you're done!`,
      `😬 ${name}: Please hurry and water me! Reply DONE after watering!`
    ],
    formal: [
      `🎩 ${name}: Soil assessment confirms watering is required. Please proceed. Reply DONE upon completion.`,
      `🎩 ${name} acknowledges: Hydration services are needed. Reply DONE after watering.`,
      `🎩 ${name}: Your prompt watering would be appreciated. Reply DONE when complete.`
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
      `🧘 ${name} breathes: No water needed yet. Balance remains.`
    ],
    anxious: [
      `😅 ${name}: Oh good! I was worried I was too dry! I'll be okay for now!`,
      `🥺 ${name} relaxes: Thank you for checking! I feel better knowing I'm okay!`,
      `😌 ${name}: Phew! Still moist! I'll try not to worry until next time!`
    ],
    formal: [
      `🎩 ${name}: Soil moisture is adequate. Watering deferred. I shall check back shortly.`,
      `🎩 ${name} notes: Hydration is not required at this time. Thank you for checking.`,
      `🎩 ${name}: Assessment complete. No watering needed. I appreciate your diligence.`
    ]
  };
  
  const personality_key = (personality || 'formal').toLowerCase();
  const options = templates[personality_key] || templates.formal;
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

module.exports = { personaMessage, confirmMessage, calibrationPrompt, waterNowMessage, waitLongerMessage, fmtCond };
