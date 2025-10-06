# LingoLeaf MVP - Quick Start

## 🎯 Installation (5 minutes)

```bash
# 1. Install Node.js (if not installed)
brew install node

# 2. Install dependencies
cd /Users/bawomaleghemi/Desktop/lingoleaf
npm install

# 3. Install Netlify CLI
npm install -g netlify-cli

# 4. Set up Supabase database
# → Go to https://app.supabase.com/project/lchgddyawflncuialrcj/sql
# → Copy/paste contents of supabase.sql
# → Run the query

# 5. Start local dev server
netlify dev
```

## 🧪 Quick Test

```bash
# Test form submission
curl -X POST "http://localhost:8888/.netlify/functions/onboard" \
  -d "email=test@test.com&phone=+16475550199&city=Toronto&country=Canada&species=Monstera%20Deliciosa&nickname=Leafy&personality=sassy&pot_size=large&pot_material=terracotta&light_exposure=south"

# Test schedule check (sends SMS)
netlify functions:invoke schedule-check --port 8888

# Test SMS reply
curl -X POST "http://localhost:8888/.netlify/functions/sms-webhook" \
  -d "From=%2B16475550199&Body=DONE"
```

## 🚀 Deploy

```bash
netlify login
netlify link
netlify deploy --prod
```

## 📱 Configure Twilio

**Production webhook:**
```
https://your-site.netlify.app/.netlify/functions/sms-webhook
```

Set at: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

---

**Full guide:** See `SETUP.md`
