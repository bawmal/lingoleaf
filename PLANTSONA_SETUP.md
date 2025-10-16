# 🎭 PlantSona Feature - Setup & Security Guide

## Overview

PlantSona is an AI-powered plant identification feature that uses OpenAI's GPT-4 Vision API to:
- Identify plant species from photos
- Generate personalized care instructions
- Create unique plant personalities (Sassy, Zen, Anxious, Formal)
- Provide fun facts about the plant

## 🔒 Security Fix Applied

**CRITICAL:** The hardcoded OpenAI API key has been removed from the codebase.

### What Was Fixed:
- ❌ **Before:** API key was hardcoded in `plantsona.js` (exposed in repository)
- ✅ **After:** API key is now loaded from environment variables only

### Files Modified:
1. `/netlify/functions/plantsona.js`
   - Removed hardcoded API key fallback
   - Removed API key logging
   - Now requires `OPENAI_API_KEY` environment variable

2. `/netlify.toml`
   - Added Node.js version specification
   - Maintained dev environment placeholder

## 🚀 Setup Instructions

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)
5. **Important:** Save it securely - you won't see it again!

### 2. Configure Environment Variables

#### For Local Development:

Add to your `.env` file (already gitignored):
```bash
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

#### For Netlify Production:

1. Go to Netlify Dashboard → Your Site → Site Settings
2. Navigate to **Environment Variables**
3. Click **Add a variable**
4. Add:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-YOUR_ACTUAL_KEY_HERE`
   - **Scopes:** Production, Deploy Previews, Branch Deploys
5. Click **Save**

### 3. Test Locally

```bash
# Start local dev server
netlify dev

# Visit in browser
open http://localhost:8888/plantsona.html

# Test the feature:
# 1. Upload a plant photo
# 2. Select a personality
# 3. Add optional nickname
# 4. Click "Generate PlantSona"
```

### 4. Deploy to Production

```bash
# Deploy to Netlify
netlify deploy --prod

# Verify environment variable is set in Netlify Dashboard
```

## 📊 API Usage & Costs

### OpenAI GPT-4o Pricing (as of 2024):
- **Input:** $2.50 per 1M tokens
- **Output:** $10.00 per 1M tokens

### Estimated Cost Per Request:
- Image analysis: ~500-1000 input tokens
- Response generation: ~300-500 output tokens
- **Cost per PlantSona:** ~$0.005-0.01 (less than 1 cent)

### Free Tier:
- OpenAI offers $5 in free credits for new accounts
- This covers approximately 500-1000 PlantSona generations

### Monitoring Usage:
1. Go to https://platform.openai.com/usage
2. Track your API usage and costs
3. Set up usage limits to prevent unexpected charges

## 🎨 Personality Styles

### Available Personalities:

1. **Sassy & Demanding** 😤
   - Dramatic, judgmental tone
   - Uses contemporary slang
   - Example: "You BETTER water me NOW! 💅"

2. **Zen & Peaceful** 🧘
   - Serene, non-judgmental
   - Focused on balance and harmony
   - Example: "When you notice my soil is dry, like autumn leaves... 🌿"

3. **Anxious & Worried** 😰
   - Panicky, dramatic consequences
   - Focuses on fears and concerns
   - Example: "Oh my gosh, PLEASE water me! I'm TERRIFIED! 😱"

4. **Formal & Proper** 🎩
   - Reserved politeness with superiority
   - Proper language and etiquette
   - Example: "One would be most obliged if you could water me 🎩"

## 🧪 Testing the Feature

### Test Cases:

1. **Common Houseplant (Easy)**
   - Upload: Photo of Pothos, Snake Plant, or Monstera
   - Expected: Accurate identification and care instructions

2. **Outdoor Plant (Medium)**
   - Upload: Photo of Tomato, Basil, or Succulent
   - Expected: Correct species and seasonal care tips

3. **Rare/Exotic Plant (Hard)**
   - Upload: Photo of rare orchid or tropical plant
   - Expected: Best-effort identification or genus-level match

4. **Multiple Plants (Edge Case)**
   - Upload: Photo with multiple plants
   - Expected: Identifies the most prominent plant

5. **Poor Quality Photo (Edge Case)**
   - Upload: Blurry or dark photo
   - Expected: Graceful error or best-effort identification

### Manual Testing Checklist:

- [ ] Upload photo successfully
- [ ] All 4 personalities work correctly
- [ ] Nickname appears in voice message
- [ ] Care instructions are scientifically accurate
- [ ] Fun facts are interesting and relevant
- [ ] Error handling works (no API key, bad photo, etc.)
- [ ] Loading state displays properly
- [ ] Results display correctly
- [ ] "Create Another PlantSona" resets form

## 🐛 Troubleshooting

### Common Issues:

**1. "OpenAI API key not configured" error**
- **Cause:** Environment variable not set
- **Fix:** Add `OPENAI_API_KEY` to `.env` (local) or Netlify Dashboard (production)

**2. "Failed to generate PlantSona" error**
- **Cause:** API key invalid or expired
- **Fix:** Generate new API key from OpenAI dashboard

**3. "Rate limit exceeded" error**
- **Cause:** Too many requests in short time
- **Fix:** Wait a few minutes, or upgrade OpenAI plan

**4. Incorrect plant identification**
- **Cause:** Poor photo quality or rare species
- **Fix:** Use clear, well-lit photos of common plants

**5. Personality not matching expected style**
- **Cause:** GPT-4 interpretation variance
- **Fix:** Adjust personality style prompts in `plantsona.js` lines 45-62

## 📈 Future Enhancements

### Planned Features:
- [ ] Save PlantSona results to user account
- [ ] Share PlantSona on social media
- [ ] Multi-language support
- [ ] Plant health diagnosis (diseased leaves, pests)
- [ ] Care schedule integration with main LingoLeaf app
- [ ] Photo gallery of identified plants
- [ ] Community plant identification voting

### Technical Improvements:
- [ ] Add image compression before upload
- [ ] Implement caching for common plants
- [ ] Add rate limiting per user
- [ ] Create admin dashboard for monitoring
- [ ] Add analytics tracking (identification success rate)

## 🔐 Security Best Practices

### ✅ Implemented:
- API key stored in environment variables only
- API key never logged or exposed in responses
- CORS headers configured properly
- Input validation for all user inputs

### 🚨 Important Reminders:
- **Never commit** `.env` file to Git
- **Never share** API keys in public channels
- **Rotate keys** if accidentally exposed
- **Monitor usage** to detect unauthorized access
- **Set spending limits** in OpenAI dashboard

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4 Vision Guide](https://platform.openai.com/docs/guides/vision)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

## 🎉 You're All Set!

PlantSona is now secure and ready to use. Just make sure to:
1. ✅ Set up your OpenAI API key
2. ✅ Test locally before deploying
3. ✅ Monitor your API usage and costs
4. ✅ Keep your API key secret!

Happy plant identifying! 🌱🎭
