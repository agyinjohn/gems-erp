# Environment Configuration Guide

## 🔧 Environment Variables

### Development (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=GEMS - GTHINK Enterprise Management System
```

### Production (.env.production or Platform Settings)
```bash
NEXT_PUBLIC_API_URL=https://gems-backend-2tsz.onrender.com/api
NEXT_PUBLIC_APP_NAME=GEMS - GTHINK Enterprise Management System
```

---

## 🚀 Deployment Platforms

### Vercel
1. Go to Project Settings → Environment Variables
2. Add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://gems-backend-2tsz.onrender.com/api`
3. Redeploy

### Netlify
1. Go to Site Settings → Environment Variables
2. Add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://gems-backend-2tsz.onrender.com/api`
3. Trigger new deploy

### Render
1. Go to Environment → Environment Variables
2. Add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://gems-backend-2tsz.onrender.com/api`
3. Redeploy

---

## 🔄 Switching Between Environments

### Option 1: Use .env files (Recommended)
```bash
# .env.local (for development)
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# .env.production (for production builds)
NEXT_PUBLIC_API_URL=https://gems-backend-2tsz.onrender.com/api
```

### Option 2: Use scripts in package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:prod": "NEXT_PUBLIC_API_URL=https://gems-backend-2tsz.onrender.com/api next build",
    "start": "next start"
  }
}
```

---

## ⚠️ Important Notes

1. **NEXT_PUBLIC_** prefix is required for client-side access
2. Changes to env vars require rebuild/redeploy
3. Never commit `.env.local` to git (already in .gitignore)
4. For production, set env vars in your hosting platform

---

## 🧪 Testing

### Test API Connection
```bash
# In browser console
console.log(process.env.NEXT_PUBLIC_API_URL)
// Should show: https://gems-backend-2tsz.onrender.com/api
```

### Test Login
1. Open browser DevTools → Network tab
2. Try to login
3. Check the request URL - should be:
   `https://gems-backend-2tsz.onrender.com/api/auth/login`

---

## 🔍 Troubleshooting

### Issue: Still connecting to localhost
**Solution:** Clear browser cache and rebuild
```bash
rm -rf .next
npm run build
```

### Issue: CORS errors
**Solution:** Check backend CORS settings allow your frontend domain

### Issue: 404 on API calls
**Solution:** Verify backend is running at the URL

---

## 📝 Current Setup

- **Backend:** https://gems-backend-2tsz.onrender.com
- **Frontend:** (Your deployment URL)
- **API Base:** https://gems-backend-2tsz.onrender.com/api
