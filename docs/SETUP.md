# Frontend Setup Guide

## Quick Start

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 2. Update Configuration

Edit `js/config.js` and replace the placeholder values:

```javascript
window.APP_CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',  // ← Your Project URL
  SUPABASE_ANON_KEY: 'eyJhbGc...',                   // ← Your anon/public key
  API_BASE_URL: 'https://your-api-gateway-url.com',  // ← Your API Gateway URL
};
```

### 3. Test Locally

Open `index.html` in your browser or use a local server:

```bash
# Python
python3 -m http.server 8000

# Node.js
npx http-server

# Then visit: http://localhost:8000
```

### 4. Deploy to GitHub Pages

```bash
git add docs/
git commit -m "Configure Supabase credentials"
git push origin main
```

Visit: `https://YOUR_USERNAME.github.io/station95admin_app/`

---

## Security Notes

### Is it safe to expose SUPABASE_ANON_KEY?

**YES!** The `anon` key is designed to be public. It's safe to include in your frontend code.

**How Supabase security works:**
- The `anon` key only allows operations you've permitted via **Row Level Security (RLS)** policies
- Users can only access data you've explicitly allowed
- The `service_role` key should **NEVER** be in frontend code (we don't use it)

### Password Security

Passwords are sent in **cleartext** over **HTTPS**:
- ✅ **This is correct and secure**
- HTTPS encrypts everything in transit
- Supabase hashes the password server-side
- Never hash passwords client-side (provides no additional security)

---

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── Login ────────→ Supabase Auth (direct)
       │
       ├─── Static Files ─→ GitHub Pages
       │
       └─── Calendar API ─→ API Gateway → Lambda
```

**Benefits:**
- No Lambda function needed for authentication
- Faster login (no extra hop)
- Lower cost (one less Lambda invocation)
- Automatic session management via Supabase

---

## Troubleshooting

### Login doesn't work

1. Check browser console for errors (F12)
2. Verify your `SUPABASE_ANON_KEY` is correct
3. Ensure Supabase email auth is enabled:
   - Dashboard → Authentication → Providers → Email

### "Invalid API key" error

- You might have copied the wrong key
- Use the **anon/public** key, not the `service_role` key
- Check for extra spaces when copying

### Already logged in but can't access admin page

- Clear localStorage: `localStorage.clear()`
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Files Overview

| File | Purpose |
|------|---------|
| `index.html` | Login page |
| `admin.html` | Admin dashboard |
| `js/config.js` | **Configuration (update this!)** |
| `js/script.js` | Calendar operations |
| `js/territories.js` | Territory management |
| `css/*.css` | Styling |

Only `js/config.js` needs to be updated!
