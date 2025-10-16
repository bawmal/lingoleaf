# 🗄️ Database Migration: Multi-Plant Support (5-Slot System)

**Date:** October 16, 2025  
**Purpose:** Enable users to have up to 5 plants with separate SMS threads

---

## 📊 Required Database Changes

### **Add Columns to `plants` Table:**

```sql
-- Add Twilio slot number
ALTER TABLE plants 
ADD COLUMN twilio_number TEXT;

-- Add slot index (0-4)
ALTER TABLE plants 
ADD COLUMN slot_index INTEGER;

-- Add unique constraint: one user can't use same slot twice
ALTER TABLE plants 
ADD CONSTRAINT unique_user_slot 
UNIQUE (phone_e164, twilio_number);

-- Create index for fast lookups by user + slot
CREATE INDEX idx_user_slot 
ON plants(phone_e164, twilio_number);

-- Create index for slot number lookups
CREATE INDEX idx_twilio_number 
ON plants(twilio_number);
```

---

## 🔧 How to Apply

### **Option 1: Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor**
3. Run each command separately:

```sql
ALTER TABLE plants ADD COLUMN twilio_number TEXT;
ALTER TABLE plants ADD COLUMN slot_index INTEGER;
ALTER TABLE plants ADD CONSTRAINT unique_user_slot UNIQUE (phone_e164, twilio_number);
CREATE INDEX idx_user_slot ON plants(phone_e164, twilio_number);
CREATE INDEX idx_twilio_number ON plants(twilio_number);
```

4. Click **"Run"** for each

### **Option 2: All at Once**

```sql
-- Add columns
ALTER TABLE plants 
ADD COLUMN twilio_number TEXT,
ADD COLUMN slot_index INTEGER;

-- Add constraint
ALTER TABLE plants 
ADD CONSTRAINT unique_user_slot 
UNIQUE (phone_e164, twilio_number);

-- Create indexes
CREATE INDEX idx_user_slot ON plants(phone_e164, twilio_number);
CREATE INDEX idx_twilio_number ON plants(twilio_number);
```

---

## 🔄 Migrate Existing Data

### **For Existing Single-Plant Users:**

```sql
-- Set all existing plants to slot 1
UPDATE plants 
SET twilio_number = 'TWILIO_SLOT_1_NUMBER_HERE',
    slot_index = 0
WHERE twilio_number IS NULL;
```

**Replace `TWILIO_SLOT_1_NUMBER_HERE` with your actual Twilio number!**

---

## ✅ Verification

After migration, verify the schema:

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plants' 
AND column_name IN ('twilio_number', 'slot_index');
```

**Expected Result:**
```
column_name    | data_type | is_nullable
---------------|-----------|------------
twilio_number  | text      | YES
slot_index     | integer   | YES
```

**Check constraint:**
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'plants' 
AND constraint_name = 'unique_user_slot';
```

**Expected Result:**
```
constraint_name  | constraint_type
-----------------|----------------
unique_user_slot | UNIQUE
```

---

## 🎯 How the System Works

### **Slot Assignment:**

**User A registers 3 plants:**
```
Plant 1: Mama    → Slot 0 → +1-727-555-0001
Plant 2: Spike   → Slot 1 → +1-727-555-0002
Plant 3: Leafy   → Slot 2 → +1-727-555-0003
```

**User B registers 2 plants:**
```
Plant 1: Rose    → Slot 0 → +1-727-555-0001 (SAME as User A's Slot 0!)
Plant 2: Daisy   → Slot 1 → +1-727-555-0002 (SAME as User A's Slot 1!)
```

### **Why This Works:**

The system identifies plants by **BOTH**:
- User's phone number (`phone_e164`)
- Slot number (`twilio_number`)

**Example:**
```sql
-- User A's "Mama" plant
SELECT * FROM plants 
WHERE phone_e164 = '+16475550123' 
AND twilio_number = '+17275550001';

-- User B's "Rose" plant (different user, same slot!)
SELECT * FROM plants 
WHERE phone_e164 = '+16475550456' 
AND twilio_number = '+17275550001';
```

Both queries return different plants! ✅

---

## 💰 Cost Analysis

### **Fixed Cost:**
- 5 Twilio numbers × $1.15/month = **$5.75/month**
- SMS: $0.0079 per message

### **Scalability:**
- ✅ Supports unlimited users
- ✅ Up to 5 plants per user
- ✅ Cost stays fixed at $5.75/month

### **Example Costs:**

**100 users, average 3 plants each:**
- Numbers: $5.75/month (fixed)
- SMS: ~300 plants × 4 messages/month × $0.0079 = ~$9.48/month
- **Total: ~$15/month**

**1,000 users, average 3 plants each:**
- Numbers: $5.75/month (fixed)
- SMS: ~3,000 plants × 4 messages/month × $0.0079 = ~$94.80/month
- **Total: ~$100/month**

---

## 🌱 User Experience

### **Onboarding:**
```
Welcome to LingoLeaf! 🌱

Your plants are registered:

🌱 Plant 1: Mama (Kalanchoe)
   📞 +1-727-555-0001
   💬 Save this number as "Mama Plant"

😬 Plant 2: Spike (Snake Plant)
   📞 +1-727-555-0002
   💬 Save this number as "Spike Plant"

🧘 Plant 3: Leafy (Pothos)
   📞 +1-727-555-0003
   💬 Save this number as "Leafy Plant"

Each plant has its own number!
Reply to each number separately to care for that plant.
```

### **Daily Use:**
```
[Separate SMS thread from +1-727-555-0001]
😤 Mama here. Check my soil: DRY or DAMP?
→ User replies: DAMP
💅 Mama: Fine, I'll wait!

[Separate SMS thread from +1-727-555-0002]
😬 Spike: Check my soil: DRY or DAMP?
→ User replies: DRY
😰 Spike: Water me NOW! Reply DONE!
```

---

## 🚀 Environment Variables Required

Add these to your `.env` and Netlify:

```bash
# Slot 1 (required - can use existing number)
TWILIO_SLOT_1=+17275550001

# Slots 2-5 (required for multi-plant support)
TWILIO_SLOT_2=+17275550002
TWILIO_SLOT_3=+17275550003
TWILIO_SLOT_4=+17275550004
TWILIO_SLOT_5=+17275550005
```

### **How to Get Numbers:**

1. Go to: https://console.twilio.com/
2. Navigate to: **Phone Numbers** → **Buy a Number**
3. Search for numbers with SMS capability
4. Buy 5 numbers (or reuse existing for Slot 1)
5. Add to environment variables

### **Configure Webhooks:**

For **EACH** of the 5 numbers:
1. Go to: **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on each number
3. Under "Messaging Configuration":
   - **A MESSAGE COMES IN:** `https://lingoleaf.ai/.netlify/functions/sms-webhook`
   - **HTTP Method:** POST
4. Save

---

## ⚠️ Important Notes

### **Limitations:**
- Maximum 5 plants per user
- Each user's first plant uses Slot 1, second uses Slot 2, etc.
- Slots are assigned sequentially

### **Backward Compatibility:**
- Existing single-plant users will be migrated to Slot 1
- No disruption to existing functionality
- Can add more plants later

### **Expanding Beyond 5 Plants:**
If you need more than 5 plants per user:
1. Buy more Twilio numbers
2. Add `TWILIO_SLOT_6`, `TWILIO_SLOT_7`, etc.
3. Update `MAX_PLANTS_PER_USER` in `twilio-pool.js`
4. Cost increases by $1.15/month per additional slot

---

## 📊 Benefits

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| **Plants per user** | 1 | 5 | ✅ 5x capacity |
| **SMS threads** | Shared | Separate | ✅ Clear organization |
| **User confusion** | Nicknames needed | None | ✅ Native UX |
| **Monthly cost** | $1.15 | $5.75 | ⚠️ +$4.60 (fixed) |
| **Scalability** | Limited | Unlimited users | ✅ Infinite |

---

## ✅ Deployment Checklist

- [ ] Buy 5 Twilio numbers (or reuse 1, buy 4 new)
- [ ] Add `TWILIO_SLOT_1` through `TWILIO_SLOT_5` to `.env`
- [ ] Add environment variables to Netlify
- [ ] Run database migration SQL
- [ ] Migrate existing plants to Slot 1
- [ ] Configure webhooks for all 5 numbers
- [ ] Deploy updated code
- [ ] Test with 2-3 plants per user

---

**After migration, users can have up to 5 plants with separate SMS threads!** 🌱🌿🪴🌵🌺
