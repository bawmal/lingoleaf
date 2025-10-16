# 🚀 Production Deployment Checklist

**Site:** https://lingoleaf.ai  
**Date:** October 15, 2025  
**Deployment:** New Flow + PlantSona Feature

---

## ✅ Code Deployment

- [x] Code committed to Git
- [x] Pushed to `main` branch
- [x] Netlify linked to project
- [ ] Deployment completed (check Netlify dashboard)

---

## 🔐 Environment Variables (CRITICAL)

**Go to:** Netlify Dashboard → Site Settings → Environment Variables

### **Required Variables:**

#### **Database (Supabase)**
- [ ] `DB_URL` - Supabase database URL
- [ ] `DB_API_KEY` - Supabase anon/service key

#### **SMS (Twilio)**
- [ ] `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- [ ] `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- [ ] `TWILIO_FROM_NUMBER` - Your Twilio phone number (e.g., +17278558712)

#### **Weather (OpenWeatherMap)**
- [ ] `OWM_API_KEY` - OpenWeatherMap API key
- [ ] `OWM_UNITS` - Set to `metric` or `imperial`

#### **Email (Resend)**
- [ ] `RESEND_API_KEY` - Resend API key for emails

#### **AI Features (OpenAI)**
- [ ] `OPENAI_API_KEY` - OpenAI API key for PlantSona feature

#### **Other**
- [ ] `DEFAULT_TIMEZONE` - Default timezone (e.g., America/Toronto)

### **How to Set:**
1. Go to: https://app.netlify.com/sites/fantastic-tanuki-1c4474/configuration/env
2. Click "Add a variable"
3. Add each variable with its value
4. Set scopes: Production, Deploy Previews, Branch Deploys
5. Click "Save"

---

## 📞 Twilio Webhook Configuration

**CRITICAL:** Set up SMS webhook for inbound messages

### **Steps:**
1. Go to: https://console.twilio.com/
2. Navigate to: Phone Numbers → Manage → Active Numbers
3. Click on your LingoLeaf number: +17278558712
4. Scroll to "Messaging Configuration"
5. Under "A MESSAGE COMES IN":
   - Webhook: `https://lingoleaf.ai/.netlify/functions/sms-webhook`
   - HTTP Method: `POST`
6. Click "Save"

**Test:** Send a text to your Twilio number and check function logs

---

## 🧪 End-to-End Testing

### **Test 1: Onboarding with "Just Watered" Status**

**Steps:**
1. Go to: https://lingoleaf.ai
2. Fill out form:
   - Email: test-watered@example.com
   - Phone: YOUR_PHONE_NUMBER
   - Plant: Monstera
   - Nickname: Test Plant 1
   - Personality: Sassy
   - **Soil Status: Just Watered**
3. Submit

**Expected:**
- ✅ Redirected to success page
- ✅ SMS: "Your Monstera, Test Plant 1, has been registered! Expect your first reminder in about X days."
- ✅ Email: Welcome email with "Your First Watering Reminder"
- ✅ Database: Plant created with `next_due_ts` = NOW + full interval

---

### **Test 2: Onboarding with "Damp" Status**

**Steps:**
1. Go to: https://lingoleaf.ai
2. Fill out form:
   - Email: test-damp@example.com
   - Phone: YOUR_PHONE_NUMBER
   - Plant: Pothos
   - Nickname: Test Plant 2
   - Personality: Zen
   - **Soil Status: Damp**
3. Submit

**Expected:**
- ✅ Redirected to success page
- ✅ SMS: Welcome message with reminder in ~half the normal interval
- ✅ Email: Welcome email
- ✅ Database: `next_due_ts` = NOW + (full interval × 0.5)

---

### **Test 3: Onboarding with "Dry" Status (CRITICAL)**

**Steps:**
1. Go to: https://lingoleaf.ai
2. Fill out form:
   - Email: test-dry@example.com
   - Phone: YOUR_PHONE_NUMBER
   - Plant: Snake Plant
   - Nickname: Test Plant 3
   - Personality: Anxious
   - **Soil Status: Dry**
3. Submit

**Expected:**
- ✅ Redirected to success page
- ✅ **IMMEDIATE SMS:** "🚨 Test Plant 3 needs water NOW! Your soil is dry. Water your plant, then reply DONE to start your care schedule. 🌱"
- ✅ Email: Welcome email with "🚨 Immediate Text Message Sent!"
- ✅ Database: `next_due_ts` = NOW (immediate)

---

### **Test 4: SMS Reply Flow - DRY**

**Prerequisites:** Have a plant in database with reminder due

**Steps:**
1. Manually trigger reminder OR wait for cron job
2. Receive SMS: "Check my soil and reply: DRY or DAMP"
3. Reply: **DRY**

**Expected:**
- ✅ SMS response: "Water me NOW! Reply DONE when finished"
- ✅ No database update yet (waiting for DONE)

---

### **Test 5: SMS Reply Flow - DAMP**

**Steps:**
1. Receive soil check SMS
2. Reply: **DAMP**

**Expected:**
- ✅ SMS response: "I'm good for now! Check back later"
- ✅ Database: `next_due_ts` updated to NOW + 12 hours
- ✅ No watering needed

---

### **Test 6: SMS Reply Flow - DONE**

**Prerequisites:** Replied DRY and received "water now" message

**Steps:**
1. Water the plant
2. Reply: **DONE**

**Expected:**
- ✅ SMS response: "Timer reset. Thank you!"
- ✅ Database: `last_watered_ts` = NOW
- ✅ Database: `next_due_ts` = NOW + full interval

---

### **Test 7: PlantSona Feature**

**Steps:**
1. Go to: https://lingoleaf.ai/plantsona.html
2. Upload a plant photo
3. Select personality: Sassy
4. Add nickname: "Planty"
5. Click "Generate PlantSona"

**Expected:**
- ✅ Loading spinner appears
- ✅ Results display:
  - Species identification
  - Personalized message in Sassy style
  - Care instructions
  - Fun facts
- ✅ No errors in browser console
- ✅ "Create Another PlantSona" button works

---

### **Test 8: Cron Job (Schedule Check)**

**Manual Trigger:**
```bash
curl -X POST https://lingoleaf.ai/.netlify/functions/schedule-check
```

**Expected:**
- ✅ Function executes successfully
- ✅ Checks database for due plants
- ✅ Sends SMS to plants where `next_due_ts <= now()`
- ✅ Check Netlify function logs for confirmation

---

## 📊 Monitoring

### **Netlify Function Logs**
- Go to: https://app.netlify.com/sites/fantastic-tanuki-1c4474/logs/functions
- Monitor for:
  - ✅ Successful function executions
  - ❌ Errors or failures
  - 📊 Execution times

### **Twilio Console**
- Go to: https://console.twilio.com/us1/monitor/logs/sms
- Check:
  - ✅ SMS delivery status
  - ✅ Inbound message webhooks
  - ❌ Failed deliveries

### **Supabase Database**
- Go to: Your Supabase dashboard
- Check `plants` table:
  - ✅ New plants being created
  - ✅ `next_due_ts` being updated
  - ✅ `last_watered_ts` being set

### **OpenAI Usage**
- Go to: https://platform.openai.com/usage
- Monitor:
  - 📊 API calls for PlantSona
  - 💰 Costs per request
  - ⚠️ Rate limits

---

## 🐛 Troubleshooting

### **SMS Not Received**
1. Check Twilio console for delivery status
2. Verify phone number format (+1XXXXXXXXXX)
3. Check Twilio account balance
4. Verify `TWILIO_FROM_NUMBER` in env vars

### **Email Not Received**
1. Check spam folder
2. Verify Resend API key
3. Check Resend dashboard for delivery status
4. Verify email address is valid

### **PlantSona Errors**
1. Check OpenAI API key is valid
2. Verify API usage limits not exceeded
3. Check browser console for errors
4. Check function logs in Netlify

### **Database Errors**
1. Verify Supabase credentials
2. Check database connection
3. Verify table schema matches code
4. Check RLS policies

### **Webhook Not Working**
1. Verify Twilio webhook URL is correct
2. Check function logs for incoming requests
3. Test webhook with curl:
   ```bash
   curl -X POST https://lingoleaf.ai/.netlify/functions/sms-webhook \
     -d "From=%2B16475550103&Body=DRY"
   ```

---

## ✅ Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Twilio webhook configured
- [ ] Test 1 (Just Watered) passed
- [ ] Test 2 (Damp) passed
- [ ] Test 3 (Dry - CRITICAL) passed
- [ ] Test 4 (Reply DRY) passed
- [ ] Test 5 (Reply DAMP) passed
- [ ] Test 6 (Reply DONE) passed
- [ ] Test 7 (PlantSona) passed
- [ ] Test 8 (Cron job) passed
- [ ] Function logs look healthy
- [ ] SMS delivery working
- [ ] Email delivery working
- [ ] Database updates working

---

## 🎉 Success Criteria

**The deployment is successful when:**
1. ✅ Users can sign up with all 3 soil statuses
2. ✅ DRY status triggers immediate SMS
3. ✅ Soil check flow works (DRY/DAMP → water/wait)
4. ✅ DONE reply resets timer correctly
5. ✅ PlantSona generates AI responses
6. ✅ Emails match SMS content
7. ✅ No errors in logs
8. ✅ All webhooks functioning

---

**Deployment URL:** https://lingoleaf.ai  
**Admin Panel:** https://app.netlify.com/sites/fantastic-tanuki-1c4474
