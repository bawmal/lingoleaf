#!/usr/bin/env node

/**
 * PlantSona Function Test Script
 * Tests the plantsona serverless function locally
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🧪 PlantSona Function Test\n');

// Debug: Show all environment variable keys (not values)
console.log('📋 Environment variables loaded:');
const envKeys = Object.keys(process.env).filter(key => 
  key.includes('OPENAI') || key.includes('API') || key.includes('KEY')
);
console.log('   Relevant keys:', envKeys.length > 0 ? envKeys.join(', ') : 'None found');
console.log('');

// Check if OpenAI API key is configured
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
  console.log('\n📝 To fix this:');
  console.log('1. Get your API key from https://platform.openai.com/api-keys');
  console.log('2. Add to .env file: OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE');
  process.exit(1);
}

console.log('✅ OpenAI API key found');
console.log(`   Key starts with: ${apiKey.substring(0, 10)}...`);

// Check if the plantsona function exists
const functionPath = path.join(__dirname, 'netlify', 'functions', 'plantsona.js');
if (!fs.existsSync(functionPath)) {
  console.error('❌ ERROR: plantsona.js function not found');
  process.exit(1);
}

console.log('✅ PlantSona function file exists');

// Check for node-fetch dependency
try {
  require('node-fetch');
  console.log('✅ node-fetch dependency installed');
} catch (e) {
  console.error('❌ ERROR: node-fetch not installed');
  console.log('   Run: npm install');
  process.exit(1);
}

console.log('\n🎉 All checks passed!');
console.log('\n📋 Next Steps:');
console.log('1. Start the dev server: netlify dev');
console.log('2. Open: http://localhost:8888/plantsona.html');
console.log('3. Upload a plant photo and test the feature');
console.log('\n💡 Tips:');
console.log('   - Use clear, well-lit photos');
console.log('   - Try all 4 personality types');
console.log('   - Check browser console for any errors');
console.log('\n🔍 Monitor API usage at: https://platform.openai.com/usage');
