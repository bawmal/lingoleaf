# 🌱 LingoLeaf MVP - Launch Checklist

## 📦 Pre-Launch Setup

### 1. Install Required Software
- [ ] Install Node.js: `brew install node`
- [ ] Verify: `node --version` (should be v18+)
- [ ] Verify: `npm --version` (should be v9+)

### 2. Install Project Dependencies
```bash
cd /Users/bawomaleghemi/Desktop/lingoleaf
npm install
npm install -g netlify-cli
```

### 3. Set Up Supabase Database
- [ ] Go to: https://app.supabase.com/project/lchgddyawflncuialrcj/sql
- [ ] Open `supabase.sql` from your project
- [ ] Copy entire contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click **Run** (or Cmd+Enter)
- [ ] Verify: Go to **Table Editor** → see `plants` table with correct columns

### 4. Update Landing Page Form
- [ ] Open `/Users/bawomaleghemi/Desktop/lingoleaf/index.html`
- [ ] Find the existing form section
- [ ] Replace with contents from `/snippets/index-form.html`
- [ ] Key change: `action="/.netlify/functions/onboard"`

---

## 🧪 Local Testing

### 5. Start Local Dev Server
```bash
netlify dev
```
- [ ] Server starts on `http://localhost:8888`
- [ ] No errors in console

### 6. Test Form Submission
- [ ] Open `http://localhost:8888` in browser
- [ ] Fill out form with test data
- [ ] Submit form
- [ ] Redirects to `/success.html`
- [ ] Check Supabase Table Editor → new row appears
- [ ] Verify all fields populated correctly

### 7. Test Schedule Check (SMS Sending)
```bash
# In Supabase, update a plant to be due now:
UPDATE plants 
SET next_due_ts = (extract(epoch from now())*1000)::bigint 
WHERE id = 'YOUR_PLANT_ID';

# Then trigger the cron function:
netlify functions:invoke schedule-check --port 8888
```
- [ ] SMS received on phone
- [ ] Message includes weather data
- [ ] Personality matches selection
- [ ] Plant nickname appears correctly

### 8. Test SMS Replies
**Test DONE:**
- [ ] Reply "DONE" to SMS
- [ ] Receive confirmation message
- [ ] Receive calibration prompt
- [ ] Check Supabase: `last_watered_ts` updated
- [ ] Check Supabase: `next_due_ts` updated

**Test DRY:**
- [ ] Reply "DRY" to SMS
- [ ] Receive confirmation
- [ ] Check Supabase: `calibration_hours` increased by +6

**Test DAMP:**
- [ ] Reply "DAMP" to SMS
- [ ] Receive confirmation
- [ ] Check Supabase: `calibration_hours` decreased by -4

---

## 🚀 Production Deployment

### 9. Link to Netlify
```bash
netlify login
netlify link
```
- [ ] Choose existing site or create new
- [ ] Site linked successfully

### 10. Set Environment Variables in Netlify
Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these:
- [ ] `DB_URL` = `https://lchgddyawflncuialrcj.supabase.co`
- [ ] `DB_API_KEY` = (your Supabase anon key)
- [ ] `OWM_API_KEY` = `b4d7a9d772b9afb077f153041c1ed533`
- [ ] `OWM_UNITS` = `metric`
- [ ] `TWILIO_ACCOUNT_SID` = (your Twilio account SID)
- [ ] `TWILIO_AUTH_TOKEN` = (your auth token)
- [ ] `TWILIO_FROM_NUMBER` = `+17278558712`

### 11. Deploy to Production
```bash
netlify deploy --prod
```
- [ ] Deployment successful
- [ ] Note your production URL
- [ ] Visit site and verify it loads

### 12. Configure Twilio Production Webhook
- [ ] Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
- [ ] Click phone number: **+17278558712**
- [ ] Under "Messaging" → "A MESSAGE COMES IN":
  - Webhook: `https://YOUR-SITE.netlify.app/.netlify/functions/sms-webhook`
  - Method: **HTTP POST**
- [ ] Click **Save**

---

## ✅ Production Testing

### 13. Test Live Form Submission
- [ ] Visit your production URL
- [ ] Submit form with real data
- [ ] Redirects to success page
- [ ] Check Supabase: new row created

### 14. Test Live SMS Flow
- [ ] In Supabase, set a plant to be due now
- [ ] Wait for hourly cron (or trigger manually in Netlify Functions)
- [ ] Receive SMS on your phone
- [ ] Reply "DONE"
- [ ] Receive confirmation
- [ ] Verify database updated

### 15. Monitor Netlify Functions
- [ ] Go to: Netlify Dashboard → Functions
- [ ] Check logs for any errors
- [ ] Verify cron job is running hourly
- [ ] Check invocation counts

---

## 🔒 Security Check

### 16. Verify Credentials Protection
- [ ] `.env` file is in `.gitignore`
- [ ] `.env` file NOT committed to Git
- [ ] Environment variables set in Netlify (not in code)
- [ ] Supabase RLS enabled (already done in SQL)

---

## 📊 Monitoring Setup

### 17. Set Up Monitoring
- [ ] Bookmark Netlify Functions logs
- [ ] Bookmark Twilio console logs
- [ ] Bookmark Supabase dashboard
- [ ] Set up email alerts in Netlify (optional)

---

## 🎉 Launch!

### 18. Go Live
- [ ] All tests passing ✅
- [ ] No errors in logs ✅
- [ ] SMS flow working ✅
- [ ] Form submissions working ✅
- [ ] Announce to beta users! 🎊

---

## 📈 Post-Launch Monitoring (First Week)

### Daily Checks:
- [ ] Check Netlify Functions logs for errors
- [ ] Monitor Twilio usage/costs
- [ ] Check Supabase for new signups
- [ ] Verify cron job running hourly
- [ ] Test SMS flow with your own plant

### Weekly Checks:
- [ ] Review user feedback
- [ ] Check for failed SMS deliveries
- [ ] Monitor API usage (OpenWeatherMap, Twilio)
- [ ] Review database growth
- [ ] Plan next features based on feedback

---

## 🐛 Troubleshooting

**If something breaks:**
1. Check Netlify Functions logs first
2. Check Twilio console for SMS errors
3. Check Supabase logs
4. Verify all environment variables are set
5. Test locally with `netlify dev`

**Common Issues:**
- **SMS not sending:** Check Twilio credentials, verify phone number is SMS-capable
- **Form not submitting:** Check Netlify Functions logs, verify DB connection
- **Wrong timezone:** Update plant's `timezone` field in database
- **Weather not showing:** Verify OpenWeatherMap API key, check lat/lon values

---

## 🎯 Success Metrics

Track these for MVP validation:
- [ ] Number of signups
- [ ] SMS delivery rate
- [ ] User reply rate (DONE/DRY/DAMP)
- [ ] Calibration adjustments per user
- [ ] User retention (still active after 2 weeks?)
- [ ] Cost per user (Twilio SMS costs)

---

**You're ready to launch! 🚀🌱**
