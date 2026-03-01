# 🚀 Deploy Your Project NOW - Step by Step

## Quickest Path to Production (15 minutes)

### Step 1: Prepare Secrets (2 minutes)

```bash
# Generate secrets (run this locally)
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

**Save these values** - you'll need them!

---

### Step 2: Deploy Backend on Render.com (5 minutes)

1. **Visit**: https://render.com
2. **Sign up** (free with GitHub)
3. **Click**: "New +" → "Web Service"
4. **Connect**: Your GitHub repo `mohith182/Predictive-Maintenance`
5. **Configure**:
   ```
   Name: uptimeai-backend
   Region: Oregon (or closest)
   Branch: main
   Root Directory: python_backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
   ```
6. **Add Environment Variables** (click "Advanced"):
   ```
   APP_ENV = production
   DEBUG = false
   SECRET_KEY = <paste-generated-secret>
   JWT_SECRET_KEY = <paste-generated-secret>
   PORT = 8000
   ```
7. **Click**: "Create Web Service"
8. **Wait**: ~5 minutes for first deployment

9. **Add Database**:
   - Click "New +" → "PostgreSQL"
   - Name: `uptimeai-db`
   - Copy the **Internal Database URL**
   - Go to backend → Environment → Add:
     ```
     DATABASE_URL = <paste-internal-database-url>
     ```
   - Backend will auto-restart

10. **Copy your backend URL**: `https://uptimeai-backend.onrender.com`

---

### Step 3: Deploy Frontend on Render.com (5 minutes)

1. **Still on Render.com**
2. **Click**: "New +" → "Static Site"
3. **Connect**: Same GitHub repo
4. **Configure**:
   ```
   Name: uptimeai-frontend
   Root Directory: (leave empty)
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
5. **Add Environment Variable**:
   ```
   VITE_API_URL = https://uptimeai-backend.onrender.com
   ```
6. **Click**: "Create Static Site"
7. **Wait**: ~3 minutes

8. **Your app is live!** 🎉
   - Frontend: `https://uptimeai-frontend.onrender.com`
   - Backend: `https://uptimeai-backend.onrender.com`

---

### Step 4: Update CORS (2 minutes)

1. Go to backend service on Render
2. Environment → Add:
   ```
   FRONTEND_URL = https://uptimeai-frontend.onrender.com
   CORS_ORIGINS = https://uptimeai-frontend.onrender.com
   ```
3. Backend will restart automatically

---

### Step 5: Verify (1 minute)

1. **Check Backend**: 
   - Visit: `https://uptimeai-backend.onrender.com/health`
   - Should show: `{"status": "healthy", ...}`

2. **Check Frontend**:
   - Visit: `https://uptimeai-frontend.onrender.com`
   - Should load your dashboard

3. **Test API**:
   - Open browser console on frontend
   - Should see API calls working

---

## 🎯 Your Live URLs

After deployment:
- **Frontend**: `https://uptimeai-frontend.onrender.com`
- **Backend API**: `https://uptimeai-backend.onrender.com`
- **API Docs**: `https://uptimeai-backend.onrender.com/docs` (if DEBUG=true)

---

## 🔧 Troubleshooting

### Backend shows error:
- Check environment variables are set
- Check logs in Render dashboard
- Verify database URL format

### Frontend can't connect:
- Verify `VITE_API_URL` matches backend URL
- Check browser console for CORS errors
- Verify backend is running

### Database errors:
- Ensure PostgreSQL is created
- Check `DATABASE_URL` is correct
- Verify database is running

---

## 📝 Next Steps

1. ✅ Test all features
2. ✅ Set up custom domain (optional)
3. ✅ Configure monitoring
4. ✅ Set up backups

---

**Your project is now live on the web!** 🌐


