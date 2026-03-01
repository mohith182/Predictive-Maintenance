# Quick Deployment Guide - Deploy to Web

## 🚀 Fastest Deployment Options

### Option 1: Render.com (Recommended - Easiest)

**Time**: ~15 minutes  
**Cost**: Free tier available

#### Steps:

1. **Go to [Render.com](https://render.com)** and sign up/login

2. **Deploy Backend (FastAPI)**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `mohith182/Predictive-Maintenance`
   - Configure:
     - **Name**: `uptimeai-backend`
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Root Directory**: `python_backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --config gunicorn_config.py`
   
   - **Add Environment Variables**:
     ```
     APP_ENV=production
     DEBUG=false
     SECRET_KEY=<generate-random-32-chars>
     JWT_SECRET_KEY=<generate-random-32-chars>
     FRONTEND_URL=https://uptimeai-frontend.onrender.com
     CORS_ORIGINS=https://uptimeai-frontend.onrender.com
     ```
   
   - Click "Create Web Service"

3. **Add PostgreSQL Database**:
   - Click "New +" → "PostgreSQL"
   - Name: `uptimeai-database`
   - Copy the **Internal Database URL**
   - Go back to backend service → Environment → Add:
     ```
     DATABASE_URL=<paste-internal-database-url>
     ```

4. **Deploy Frontend (React)**:
   - Click "New +" → "Static Site"
   - Connect same GitHub repository
   - Configure:
     - **Name**: `uptimeai-frontend`
     - **Root Directory**: (leave empty)
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`
   
   - **Add Environment Variable**:
     ```
     VITE_API_URL=https://uptimeai-backend.onrender.com
     ```
   
   - Click "Create Static Site"

5. **Wait for deployment** (~5-10 minutes)

6. **Your app will be live at**:
   - Frontend: `https://uptimeai-frontend.onrender.com`
   - Backend: `https://uptimeai-backend.onrender.com`

---

### Option 2: Railway.app (Very Easy)

**Time**: ~10 minutes  
**Cost**: Free tier available

#### Steps:

1. **Go to [Railway.app](https://railway.app)** and sign up with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose: `mohith182/Predictive-Maintenance`

3. **Railway will auto-detect services**:
   - Backend (Python)
   - Frontend (Node.js)

4. **Configure Backend**:
   - Click on backend service
   - Go to "Variables" tab
   - Add all environment variables from `python_backend/.env.example`
   - Set `DATABASE_URL` (Railway will create PostgreSQL automatically)

5. **Configure Frontend**:
   - Click on frontend service
   - Add: `VITE_API_URL=https://your-backend-url.railway.app`
   - Set build command: `npm run build`

6. **Deploy**: Railway auto-deploys on push to main

---

### Option 3: Vercel (Frontend) + Render (Backend)

**Best for**: Fast frontend deployment

#### Frontend on Vercel:

1. **Go to [Vercel.com](https://vercel.com)** and sign up with GitHub

2. **Import Project**:
   - Click "Add New" → "Project"
   - Import: `mohith182/Predictive-Maintenance`

3. **Configure**:
   - **Framework Preset**: Vite
   - **Root Directory**: (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

5. **Deploy**: Click "Deploy"

#### Backend on Render:
Follow Option 1 steps 2-3 above.

---

## 🔑 Generate Secrets

Before deploying, generate secure secrets:

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or online: https://randomkeygen.com/
```

Use the output for:
- `SECRET_KEY`
- `JWT_SECRET_KEY`

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check works: `https://your-backend-url/health`
- [ ] Frontend loads correctly
- [ ] API calls work from frontend
- [ ] Database connection successful
- [ ] ML models load properly
- [ ] Authentication works
- [ ] Predictions return results

---

## 🌐 Custom Domain (Optional)

### Render:
1. Go to service settings
2. Click "Custom Domains"
3. Add your domain
4. Update DNS records as instructed

### Vercel:
1. Go to project settings
2. Click "Domains"
3. Add your domain
4. Follow DNS setup instructions

---

## 📊 Monitoring

After deployment, monitor:
- **Render Dashboard**: View logs and metrics
- **Health Endpoint**: `https://your-backend-url/health`
- **Application Logs**: Check for errors

---

## 🆘 Troubleshooting

### Backend won't start:
- Check environment variables
- Verify database connection string
- Check logs in Render/Railway dashboard

### Frontend can't connect:
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration in backend
- Ensure backend is running

### Database errors:
- Verify `DATABASE_URL` format
- Check database is created and running
- Run migrations if needed

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed instructions.


