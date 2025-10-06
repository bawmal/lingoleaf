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

  switch ((personality || '').toLowerCase()) {
    case 'sassy':
      return `😤 ${name} here. ${ctx} I'm *parched*. Water me now, human. 💧 Reply DONE when finished.`;
    case 'zen':
      return `🧘 ${name} whispers: ${ctx} When you have a peaceful moment, a drink would be lovely. 🌿 Reply DONE after watering.`;
    case 'anxious':
      return `😬 ${name}: ${ctx} I'm worried I'll wilt… Could you water me? Reply DONE when you do.`;
    case 'formal':
    default:
      return `🎩 ${name}: ${ctx} A prompt watering would be most appreciated. Kindly reply DONE once complete.`;
  }
}

function confirmMessage({ personality, nickname, species }) {
  const name = nickname || species || 'Your plant';
  switch ((personality || '').toLowerCase()) {
    case 'sassy':   return `💅 ${name} thanks you! Timer reset. Don't make me beg next time.`;
    case 'zen':     return `🌿 ${name} thanks you. Timer reset. Inhale, exhale—we thrive.`;
    case 'anxious': return `🥲 ${name} feels safer now. Timer reset. Thank you!`;
    case 'formal':
    default:        return `✅ ${name} appreciates your care. Timer reset.`;
  }
}

function calibrationPrompt() {
  return `Quick check: was the soil DRY or DAMP? Reply DRY or DAMP to fine‑tune reminders.`;
}

module.exports = { personaMessage, confirmMessage, calibrationPrompt, fmtCond };
