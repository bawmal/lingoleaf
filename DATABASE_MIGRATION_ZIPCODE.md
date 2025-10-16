# 🗄️ Database Migration: Add Zipcode Field

**Date:** October 16, 2025  
**Purpose:** Add zipcode field for more precise geocoding

---

## 📊 Required Database Change

### **Add Column to `plants` Table:**

```sql
ALTER TABLE plants 
ADD COLUMN zipcode TEXT;
```

**Field Details:**
- **Name:** `zipcode`
- **Type:** `TEXT`
- **Nullable:** Yes (optional field)
- **Purpose:** Store zip/postal code for precise weather coordinates

---

## 🔧 How to Apply

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to: **Table Editor** → **plants** table
3. Click **"+ Add Column"**
4. Settings:
   - Name: `zipcode`
   - Type: `text`
   - Default value: (leave empty)
   - Is nullable: ✅ Yes
   - Is unique: ❌ No
5. Click **"Save"**

### **Option 2: SQL Editor**

1. Go to: **SQL Editor** in Supabase
2. Run this query:
   ```sql
   ALTER TABLE plants 
   ADD COLUMN zipcode TEXT;
   ```
3. Click **"Run"**

---

## ✅ Verification

After adding the column, verify it exists:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plants' 
AND column_name = 'zipcode';
```

**Expected Result:**
```
column_name | data_type | is_nullable
------------|-----------|------------
zipcode     | text      | YES
```

---

## 🎯 Benefits

### **Before (City-based):**
- Geocoding: "Toronto, Canada" → General city center coordinates
- Accuracy: ~10-50 km radius
- Weather: City-wide average

### **After (Zipcode-based):**
- Geocoding: "M5V 3A8" → Specific neighborhood coordinates
- Accuracy: ~1-5 km radius
- Weather: Neighborhood-specific conditions

### **Example:**
```
Toronto, Canada → 43.6532° N, 79.3832° W (downtown)
M5V 3A8 → 43.6426° N, 79.3871° W (Entertainment District)
```

**More accurate weather = Better watering schedules!** 🌱

---

## 🔄 Backward Compatibility

**Existing plants without zipcode:**
- ✅ Will continue to work
- ✅ Fallback to city-based geocoding
- ✅ No data loss

**New plants with zipcode:**
- ✅ Use zipcode for precise coordinates
- ✅ Fallback to city if zipcode fails
- ✅ Better weather accuracy

---

## 📝 Code Changes

### **Frontend (`index.html`):**
- ✅ Added zipcode input field
- ✅ Required field
- ✅ 3-column grid: Zipcode | City | Country

### **Backend (`onboard.js`):**
- ✅ Extract `zipcode` from form data
- ✅ Try zipcode geocoding first (OpenWeatherMap Zip API)
- ✅ Fallback to city geocoding if zipcode fails
- ✅ Store zipcode in database

---

## 🚀 Deployment Checklist

- [ ] Add `zipcode` column to Supabase `plants` table
- [ ] Deploy updated code to production
- [ ] Test signup with zipcode
- [ ] Verify geocoding logs show zipcode usage
- [ ] Check database has zipcode stored

---

**After migration, all new signups will have more precise weather data!** 🎉
