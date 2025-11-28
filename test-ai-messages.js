// Test script for AI-generated plant messages
// Run: node test-ai-messages.js

require('dotenv').config();
const { personaMessage } = require('./netlify/functions/lib/messaging');

async function testMessages() {
  console.log('🧪 Testing AI-Generated Plant Messages\n');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      personality: 'sassy',
      nickname: 'Spike',
      species: 'Snake Plant',
      temp: 32,
      condition: 'Clear',
      units: 'metric'
    },
    {
      personality: 'zen',
      nickname: 'Leafy',
      species: 'Monstera',
      temp: 0,
      condition: 'Snow',
      units: 'metric'
    },
    {
      personality: 'anxious',
      nickname: 'Buddy',
      species: 'Pothos',
      temp: 95,
      condition: 'Clear',
      units: 'imperial'
    },
    {
      personality: 'formal',
      nickname: 'Sir Plantalot',
      species: 'Fiddle Leaf Fig',
      temp: 72,
      condition: 'Cloudy',
      units: 'imperial'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📱 ${testCase.personality.toUpperCase()} - ${testCase.nickname} (${testCase.species})`);
    console.log(`   Weather: ${testCase.temp}°${testCase.units === 'imperial' ? 'F' : 'C'}, ${testCase.condition}`);
    console.log('-'.repeat(60));
    
    try {
      const message = await personaMessage(testCase);
      console.log(`✅ Message: ${message}`);
      console.log(`   Length: ${message.length} characters`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
    
    console.log('='.repeat(60));
  }
  
  console.log('\n✨ Test complete!\n');
  console.log('💡 Tips:');
  console.log('   - AI messages should feel natural and conversational');
  console.log('   - Each message should be unique (run again to see variety)');
  console.log('   - If AI fails, you\'ll see template fallback messages');
  console.log('   - Check that messages stay under 160 characters\n');
}

testMessages().catch(console.error);
