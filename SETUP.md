# LingoLeaf MVP - Complete Setup Guide

## ✅ What's Already Done

All files are created and configured:
- ✅ Netlify Functions (onboard, schedule-check, sms-webhook)
- ✅ Library modules (db, schedule, messaging)
- ✅ Configuration files (netlify.toml, package.json)
- ✅ Environment variables (.env) with your credentials
- ✅ Supabase SQL schema (supabase.sql)
- ✅ Form snippet (snippets/index-form.html)
- ✅ Success page (success.html)

---

## 🚀 Next Steps

### 1. Install Node.js & npm

**Option A: Using Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node
```

**Option B: Direct Download**
- Visit: https://nodejs.org/
- Download the LTS version for macOS
- Run the installer

**Verify Installation:**
```bash
node --version  # Should show v18.x or higher
npm --version   # Should show v9.x or higher
```

---

### 2. Set Up Supabase Database

1. Go to: https://app.supabase.com/project/lchgddyawflncuialrcj
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase.sql`
5. Click **Run** (or press Cmd+Enter)
6. Verify: Go to **Table Editor** → you should see a `plants` table

---

### 3. Install Project Dependencies

```bash
cd /Users/bawomaleghemi/Desktop/lingoleaf
npm install
```

This installs:
- `node-fetch` - For API calls
- `twilio` - For SMS functionality

---

### 4. Install Netlify CLI

```bash
npm install -g netlify-cli
```

---

### 5. Start Local Development Server

```bash
netlify dev
```

This will:
- Start a local server on `http://localhost:8888`
- Make functions available at `http://localhost:8888/.netlify/functions/`
- Load environment variables from `.env`

---

### 6. Configure Twilio Webhook

**For Local Testing (using ngrok or similar):**
1. Install ngrok: `brew install ngrok`
2. In a new terminal: `ngrok http 8888`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
5. Click your phone number: **+17278558712**
6. Under "Messaging" → "A MESSAGE COMES IN":
   - Webhook: `https://abc123.ngrok.io/.netlify/functions/sms-webhook`
   - Method: **HTTP POST**
7. Click **Save**

**For Production (after deploying to Netlify):**
- Webhook: `https://your-site.netlify.app/.netlify/functions/sms-webhook`

---

### 7. Update Your Landing Page Form

Replace the form in `/Users/bawomaleghemi/Desktop/lingoleaf/index.html` with the form from:
`/Users/bawomaleghemi/Desktop/lingoleaf/snippets/index-form.html`

Key changes:
- `action="/.netlify/functions/onboard"` (points to your function)
- Includes all required fields: phone, city, country, species, personality, pot details, light exposure

---

## 🧪 Testing Guide

### Test 1: Form Submission (Onboard Function)

**Method 1: Via Browser**
1. Start `netlify dev`
2. Open `http://localhost:8888`
3. Fill out the form
4. Submit
5. Should redirect to `/success.html`
6. Check Supabase Table Editor → new row should appear

**Method 2: Via cURL**
```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/onboard" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "email=test@example.com&phone=+16475550199&city=Toronto&country=Canada&species=Monstera%20Deliciosa&nickname=Leafy&personality=sassy&pot_size=large&pot_material=terracotta&light_exposure=south"
```

---

### Test 2: Schedule Check (Cron Function)

**Manually trigger the hourly check:**
```bash
netlify functions:invoke schedule-check --port 8888
```

**To test with a real SMS:**
1. In Supabase, find a plant row
2. Update `next_due_ts` to current timestamp:
   ```sql
   UPDATE plants 
   SET next_due_ts = (extract(epoch from now())*1000)::bigint 
   WHERE phone_e164 = '+YOUR_PHONE_NUMBER';
   ```
3. Run: `netlify functions:invoke schedule-check --port 8888`
4. You should receive an SMS!

---

### Test 3: SMS Webhook (Reply Handling)

**Test DONE reply:**
```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/sms-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "From=%2B16475550199&Body=DONE"
```

**Test DRY reply:**
```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/sms-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "From=%2B16475550199&Body=DRY"
```

**Test DAMP reply:**
```bash
curl -i -X POST "http://localhost:8888/.netlify/functions/sms-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "From=%2B16475550199&Body=DAMP"
```

---

## 🚀 Deploy to Production

### 1. Link to Netlify

```bash
netlify login
netlify link
```

Choose your existing LingoLeaf site or create a new one.

---

### 2. Set Environment Variables in Netlify

Go to: Netlify Dashboard → Site Settings → Environment Variables

Add these variables:
```
DB_URL=https://lchgddyawflncuialrcj.supabase.co
DB_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjaGdkZHlhd2ZsbmN1aWFscmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjI1OTcsImV4cCI6MjA3NTMzODU5N30.o4evq08e2a-atTm5T4CMb2dWdnDY48QV54uCqM2X4H0
OWM_API_KEY=b4d7a9d772b9afb077f153041c1ed533
OWM_UNITS=metric
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=6c627f8cdb521d478c6db36d765deaf1
TWILIO_FROM_NUMBER=+17278558712
```

---

### 3. Deploy

```bash
netlify deploy --prod
```

---

### 4. Update Twilio Webhook to Production URL

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click your number: **+17278558712**
3. Update webhook to: `https://your-site.netlify.app/.netlify/functions/sms-webhook`
4. Save

---

## 📋 QA Checklist

Before going live, verify:

- [ ] Supabase `plants` table exists with correct schema
- [ ] All environment variables set in Netlify
- [ ] Form submits successfully and creates database row
- [ ] Redirect to `/success.html` works
- [ ] Schedule-check function sends SMS when plant is due
- [ ] SMS reply "DONE" updates `last_watered_ts` and `next_due_ts`
- [ ] SMS reply "DRY" increases `calibration_hours` by +6
- [ ] SMS reply "DAMP" decreases `calibration_hours` by -4
- [ ] Weather data appears in SMS messages
- [ ] Twilio webhook configured for production URL
- [ ] Netlify cron job is active (check Netlify Functions logs)

---

## 🎯 Plant Personality Examples

When you receive SMS reminders, they'll look like:

**Sassy:**
> 😤 Leafy here. It's 22°C and clear. I'm *parched*. Water me now, human. 💧 Reply DONE when finished.

**Zen:**
> 🧘 Leafy whispers: It's 22°C and clear. When you have a peaceful moment, a drink would be lovely. 🌿 Reply DONE after watering.

**Anxious:**
> 😬 Leafy: It's 22°C and clear. I'm worried I'll wilt… Could you water me? Reply DONE when you do.

**Formal:**
> 🎩 Leafy: It's 22°C and clear. A prompt watering would be most appreciated. Kindly reply DONE once complete.

---

## 🐛 Troubleshooting

### Function errors in logs?
- Check Netlify Functions logs for detailed error messages
- Verify all environment variables are set correctly
- Check Supabase connection (test with SQL query)

### SMS not sending?
- Verify Twilio credentials in `.env` / Netlify
- Check Twilio console for error logs
- Ensure phone number is SMS-capable
- Check `next_due_ts` is in the past

### SMS replies not working?
- Verify Twilio webhook URL is correct
- Check it's set to HTTP POST
- Test with cURL first
- Check Netlify Functions logs

### Database errors?
- Verify Supabase URL and API key
- Check RLS policies (use service_role key to bypass)
- Verify table schema matches `supabase.sql`

---

## 📞 Support

If you encounter issues:
1. Check Netlify Functions logs
2. Check Twilio console logs
3. Check Supabase logs
4. Review this setup guide

---

## 🎉 You're Ready!

Once Node.js is installed and you've run through the setup steps, your LingoLeaf MVP will be fully functional with:
- ✅ 80-plant knowledge base
- ✅ Personality-driven SMS reminders
- ✅ Weather-aware messaging
- ✅ User calibration (DRY/DAMP)
- ✅ Automated hourly checks
- ✅ Beautiful landing page

**Happy planting! 🌱**
