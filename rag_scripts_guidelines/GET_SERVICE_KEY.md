# How to Get Your Supabase Service Role Key

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
Go to: **https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/settings/api**

(This is your project's API settings page)

---

### Step 2: Find the Keys Section

You'll see a section called **"Project API keys"** with two keys:

```
┌─────────────────────────────────────────────────┐
│ Project API keys                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│ anon                                             │
│ public                                           │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...         │
│ [Copy button]                                    │
│                                                  │
│ ⚠️ This key is safe to use in a browser          │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│ service_role                                     │
│ secret                                           │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...         │
│ [Copy button]                                    │
│                                                  │
│ ⚠️ This key has full access - keep it secret!    │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

### Step 3: Copy the Service Role Key

Click the **[Copy]** button next to the **`service_role`** key (the second one)

**Important:**
- ✅ Copy the `service_role` key (says "secret" underneath)
- ❌ NOT the `anon` key (says "public" underneath)

The service_role key will be MUCH longer and start with `eyJ...` but will be different from the anon key.

---

### Step 4: Update the .env File

Open: `rag_scripts_guidelines/.env`

Find this line:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ
```

Replace the entire key after `=` with the service_role key you just copied.

---

### Step 5: Run the Test

```bash
cd rag_scripts_guidelines
python3 test_single_pdf.py
```

Should now show:
```
✅ Successfully inserted 74 chunks!
✅ TEST PASSED!
```

---

## Visual Guide

If you're on the Supabase dashboard, here's where to look:

```
Supabase Dashboard
├── Your Project (felofmlhqwcdpiyjgstx)
│   ├── Settings (⚙️ icon in left sidebar)
│   │   ├── API
│   │   │   ├── Project API keys
│   │   │   │   ├── anon / public ← DON'T USE THIS
│   │   │   │   └── service_role / secret ← USE THIS ONE ✅
```

---

## Screenshot Locations

The page should look like this:

**URL:** `https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/settings/api`

**Left Sidebar:** Click ⚙️ **Settings** → **API**

**Main Content:** Scroll to **"Project API keys"** section

---

## Security Note

⚠️ **IMPORTANT:** The service_role key has FULL database access:
- Can read all data
- Can write all data
- Bypasses all security rules

**Never:**
- ❌ Commit it to git
- ❌ Share it publicly
- ❌ Use it in frontend code

**Only use it:**
- ✅ In backend scripts (like our Python script)
- ✅ In Edge Functions (Supabase handles this automatically)
- ✅ In local .env files (already in .gitignore)

---

## Quick Verification

After pasting the key, you can verify it's the right one:

```bash
# The service_role key should decode to show "role": "service_role"
python3 -c "
import base64, json
key = 'YOUR_KEY_HERE'  # Paste the key
payload = key.split('.')[1]
padding = '=' * (4 - len(payload) % 4)
decoded = json.loads(base64.urlsafe_b64decode(payload + padding))
print(f\"Role: {decoded['role']}\")
"
```

Expected output:
```
Role: service_role  ✅
```

If it says `Role: anon` ❌, you copied the wrong key.

---

## Need Help?

If you can't find the service_role key:
1. Make sure you're logged in to Supabase
2. Make sure you're viewing the correct project (felofmlhqwcdpiyjgstx)
3. Check that you have admin/owner permissions on the project
4. The key should be on the Settings → API page

Let me know if you see something different and I can help troubleshoot!
