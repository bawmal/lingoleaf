# 🗄️ Database Migration: Add skip_soil_check Field

**Date:** October 16, 2025  
**Purpose:** Enable smart DAMP → Water flow (skip redundant soil checks)

---

## 📊 Required Database Change

### **Add Column to `plants` Table:**

```sql
ALTER TABLE plants 
ADD COLUMN skip_soil_check BOOLEAN DEFAULT FALSE;
```

**Field Details:**
- **Name:** `skip_soil_check`
- **Type:** `BOOLEAN`
- **Default:** `FALSE`
- **Nullable:** Yes
- **Purpose:** Flag to skip soil check and send direct watering message

---

## 🔧 How to Apply

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to: **Table Editor** → **plants** table
3. Click **"+ Add Column"**
4. Settings:
   - Name: `skip_soil_check`
   - Type: `bool`
   - Default value: `false`
   - Is nullable: ✅ Yes
   - Is unique: ❌ No
5. Click **"Save"**

### **Option 2: SQL Editor**

1. Go to: **SQL Editor** in Supabase
2. Run this query:
   ```sql
   ALTER TABLE plants 
   ADD COLUMN skip_soil_check BOOLEAN DEFAULT FALSE;
   ```
3. Click **"Run"**

---

## ✅ Verification

After adding the column, verify it exists:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'plants' 
AND column_name = 'skip_soil_check';
```

**Expected Result:**
```
column_name      | data_type | column_default
-----------------|-----------|---------------
skip_soil_check  | boolean   | false
```

---

## 🎯 What This Enables

### **Old Flow (Repetitive):**
```
Check 1: "Check soil: DRY or DAMP?"
User: DAMP
Response: "I'll wait!"
Timer: +12 hours (hardcoded)

Check 2: "Check soil: DRY or DAMP?" ← Annoying repeat!
User: DAMP again
Response: "Still waiting..."
Timer: +12 hours

Check 3: "Check soil: DRY or DAMP?" ← Very annoying!
User: Finally DRY
Response: "Water now!"
```

### **New Flow (Smart & Simple):**
```
Check 1: "Check soil: DRY or DAMP?"
User: DAMP
Response: "I'll check back soon!"
Timer: Weather-aware calculation (60% of remaining time)
Flag: skip_soil_check = TRUE

Check 2: "💧 Water me NOW! Reply DONE" ← Direct water message!
User: DONE
Response: "Timer reset!"
Flag: skip_soil_check = FALSE
```

---

## 🌤️ Weather-Aware Timing

Instead of hardcoded 12 hours, the system now calculates:

```javascript
// Calculate remaining time in schedule
const totalInterval = adjusted_hours * 3600000; // e.g., 129h for Mama
const timeElapsed = now - last_watered_ts;
const remainingTime = totalInterval - timeElapsed;

// Next check at 60% of remaining time
const waitTime = remainingTime > 0 
  ? Math.floor(remainingTime * 0.6) 
  : Math.floor(totalInterval * 0.5);
```

**Example (Mama's Kalanchoe):**
- Full interval: 129 hours (~5.4 days)
- User checks at 50 hours elapsed
- Remaining: 79 hours
- Next check: 79 × 0.6 = **47 hours** (not 12!)
- Accounts for: temperature, humidity, pot type, light

---

## 🔄 Flow Logic

### **When User Replies DAMP:**
1. ✅ Calculate weather-aware wait time
2. ✅ Set `next_due_ts` to smart interval
3. ✅ Set `skip_soil_check = TRUE`
4. ✅ Send "I'll wait" message

### **When Cron Job Runs:**
1. ✅ Check if `skip_soil_check = TRUE`
2. ✅ If TRUE: Send direct "Water now!" message
3. ✅ Clear flag: `skip_soil_check = FALSE`
4. ✅ If FALSE: Send normal "Check soil" message

### **When User Replies DONE:**
1. ✅ Update `last_watered_ts = NOW`
2. ✅ Calculate new `next_due_ts`
3. ✅ Clear flag: `skip_soil_check = FALSE`
4. ✅ Send confirmation message

---

## 📈 Benefits

### **User Experience:**
- ✅ **Less annoying** - No repeated "check soil" messages
- ✅ **Simpler** - One check, then water
- ✅ **Smarter** - Weather-aware timing

### **Plant Health:**
- ✅ **Prevents overwatering** - Still checks once before watering
- ✅ **Adapts to conditions** - Hot weather = shorter wait
- ✅ **Precise timing** - Based on actual schedule, not arbitrary 12h

### **Technical:**
- ✅ **Backward compatible** - Existing plants default to FALSE
- ✅ **No breaking changes** - Old flow still works
- ✅ **Clean state management** - Flag auto-clears after use

---

## 🚀 Deployment Checklist

- [ ] Add `skip_soil_check` column to Supabase `plants` table
- [ ] Deploy updated code to production
- [ ] Test DAMP reply flow
- [ ] Verify weather-aware timing in logs
- [ ] Confirm skip flag clears after watering

---

**After migration, users get smarter, less repetitive reminders!** 🎉
