# 🧪 LingoLeaf Testing Plan - New Flow

**Server:** http://localhost:8888  
**Date:** October 15, 2025

---

## ✅ Test 1: Onboarding with "Just Watered" Status

### **Steps:**
1. Open http://localhost:8888
2. Fill out the form:
   - Email: test1@example.com
   - Phone: +16475550101
   - City: Toronto
   - Country: Canada
   - Plant Species: Monstera Deliciosa
   - Nickname: Leafy
   - Personality: Sassy
   - Pot Size: Large
   - Pot Material: Terracotta
   - Light Exposure: East-facing
   - **Current Soil Condition: Just Watered**
3. Submit form

### **Expected Results:**
- ✅ Redirected to success page
- ✅ SMS received: "Your Monstera Deliciosa, Leafy, has been registered! Expect your first reminder in about X days."
- ✅ Database: `next_due_ts` = NOW + full interval
- ✅ No immediate watering reminder

---

## ✅ Test 2: Onboarding with "Damp" Status

### **Steps:**
1. Open http://localhost:8888
2. Fill out the form:
   - Email: test2@example.com
   - Phone: +16475550102
   - City: Portland
   - Country: USA
   - Plant Species: Pothos
   - Nickname: Vinny
   - Personality: Zen
   - Pot Size: Small
   - Pot Material: Plastic
   - Light Exposure: North-facing
   - **Current Soil Condition: Damp**
3. Submit form

### **Expected Results:**
- ✅ Redirected to success page
- ✅ SMS received: "Your Pothos, Vinny, has been registered! Expect your first reminder in about X days." (half interval)
- ✅ Database: `next_due_ts` = NOW + (full interval × 0.5)
- ✅ No immediate watering reminder

---

## 🚨 Test 3: Onboarding with "Dry" Status (CRITICAL TEST)

### **Steps:**
1. Open http://localhost:8888
2. Fill out the form:
   - Email: test3@example.com
   - Phone: +16475550103
   - City: Phoenix
   - Country: USA
   - Plant Species: Snake Plant
   - Nickname: Spike
   - Personality: Anxious
   - Pot Size: Large
   - Pot Material: Terracotta
   - Light Exposure: South-facing
   - **Current Soil Condition: Dry**
3. Submit form

### **Expected Results:**
- ✅ Redirected to success page
- ✅ **IMMEDIATE SMS received:** "🚨 Spike needs water NOW! Your soil is dry. Water your plant, then reply DONE to start your care schedule. 🌱"
- ✅ Database: `next_due_ts` = NOW (or very close)
- ✅ SMS arrives within seconds of signup

---

## ✅ Test 4: New Reminder Flow - Soil Check First

### **Prerequisites:**
- Need a plant in database with `next_due_ts` in the past
- Can manually trigger with: `netlify functions:invoke schedule-check`

### **Steps:**
1. Trigger cron job manually OR wait for hourly run
2. Check phone for SMS

### **Expected Results:**
- ✅ SMS received: "😬 [Plant name]: I'm so worried! Please check my soil—am I DRY or DAMP?" (or similar based on personality)
- ✅ Message asks for soil check FIRST (not "water me now")

---

## ✅ Test 5: User Replies "DRY"

### **Prerequisites:**
- Received soil check reminder from Test 4

### **Steps:**
1. Reply to SMS: "DRY"

### **Expected Results:**
- ✅ SMS received: "😰 [Plant name]: Oh thank goodness! Please water me! Reply DONE after!" (or similar)
- ✅ Message tells user to water NOW
- ✅ Waits for DONE reply

---

## ✅ Test 6: User Replies "DAMP"

### **Prerequisites:**
- Received soil check reminder from Test 4

### **Steps:**
1. Reply to SMS: "DAMP"

### **Expected Results:**
- ✅ SMS received: "😅 [Plant name]: Oh good! I was worried I was too dry! I'll be okay for now!" (or similar)
- ✅ Database: `next_due_ts` updated to NOW + 12 hours
- ✅ No watering needed
- ✅ Will check again in 12 hours

---

## ✅ Test 7: User Replies "DONE" After Watering

### **Prerequisites:**
- Replied "DRY" and received "water now" message

### **Steps:**
1. Water the plant (in real life or pretend)
2. Reply to SMS: "DONE"

### **Expected Results:**
- ✅ SMS received: "🥲 [Plant name] feels safer now. Timer reset. Thank you!" (or similar)
- ✅ Database: `last_watered_ts` = NOW
- ✅ Database: `next_due_ts` = NOW + full interval
- ✅ Next reminder scheduled properly

---

## 🎭 Test 8: PlantSona Feature

### **Steps:**
1. Open http://localhost:8888/plantsona.html
2. Upload a plant photo
3. Select personality: Sassy
4. Add nickname: "Planty"
5. Click "Generate PlantSona"

### **Expected Results:**
- ✅ Loading spinner appears
- ✅ Results display with:
  - Species identification
  - Personalized voice message in Sassy style
  - Care instructions in Sassy style
  - Fun facts in Sassy style
- ✅ No errors in console
- ✅ "Create Another PlantSona" button works

---

## 🔍 Database Checks

### **After Each Test:**
1. Check Supabase Table Editor
2. Verify fields:
   - ✅ `next_due_ts` is correct
   - ✅ `last_watered_ts` is set (for DONE replies)
   - ✅ `personality` matches selection
   - ✅ `species`, `nickname` are correct
   - ✅ `lat`, `lon` are populated (geocoding worked)

---

## 📱 SMS Testing Notes

**Important:**
- Use real phone numbers you have access to
- Or use Twilio test credentials for sandbox testing
- Check Twilio console logs for delivery status
- Verify message content matches personality

---

## 🐛 Common Issues to Watch For

1. **SMS not received:**
   - Check Twilio credentials in `.env`
   - Check Twilio console for errors
   - Verify phone number format (+1XXXXXXXXXX)

2. **Database not updating:**
   - Check Supabase credentials
   - Check function logs in terminal
   - Verify table permissions

3. **PlantSona errors:**
   - Check OpenAI API key is valid
   - Check API usage limits
   - Check browser console for errors

4. **Geocoding fails:**
   - Check OpenWeatherMap API key
   - Verify city/country spelling
   - Check API rate limits

---

## ✅ Success Criteria

All tests should pass with:
- ✅ No errors in terminal/console
- ✅ SMS messages received with correct content
- ✅ Database updated correctly
- ✅ User flow is smooth and logical
- ✅ Personality messages match selected style
- ✅ "DRY" status triggers immediate action
- ✅ Soil check happens BEFORE watering instruction

---

## 🚀 Ready to Test!

**Start with Test 3 (DRY status) - this is the critical new feature!**

Open: http://localhost:8888
