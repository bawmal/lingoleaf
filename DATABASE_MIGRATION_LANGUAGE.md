# Database Migration: Add Language Column

## Purpose
Add a `language` column to the `plants` table to store the user's preferred language for SMS messages.

## SQL Migration

Run this SQL in your Supabase SQL editor:

```sql
-- Add language column to plants table
ALTER TABLE plants 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Add comment for documentation
COMMENT ON COLUMN plants.language IS 'User preferred language for SMS messages (en=English, fr=French)';
```

## Supported Languages
- `en` - English (default)
- `fr` - French (Français)

## How It Works
1. When a user signs up, they select their preferred language in the form
2. The language preference is stored in the `language` column
3. All SMS messages (reminders, confirmations, etc.) are sent in the user's preferred language
4. Users can reply in either language:
   - English: DRY, DAMP, DONE
   - French: SEC, HUMIDE, FAIT
