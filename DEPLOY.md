# VibeTrust Backend - MVP Deployment Guide

## ✅ Backend Status: READY FOR DEPLOYMENT

Your backend is tested and working locally. All files are configured for Render deployment.

## 🚀 Deploy to Render NOW

### Option 1: Using Blueprint (RECOMMENDED)

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Blueprint"**
3. Connect repository: `Bharadwaj-2024/Trust-ai-`
4. Render will detect `render.yaml` automatically
5. Click **"Apply"** - Done!

### Option 2: Manual Setup

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect repository: `Bharadwaj-2024/Trust-ai-`
4. **Runtime**: Select **Python 3** (IMPORTANT: Don't use auto-detect)
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `python manage.py`
7. **Environment Variables**:
   - `DEMO_MODE` = `true`
8. Click **"Create Web Service"**

## 📋 What's Deployed

- **Backend API**: FastAPI application
- **Demo Mode**: Enabled (works without API keys)
- **Port**: Auto-configured by Render
- **Python**: 3.10.13

## 🧪 Test After Deployment

Once deployed, your URL will be: `https://vibetrust-backend.onrender.com`

Test it:
```bash
curl https://your-app.onrender.com/
```

Expected response:
```json
{
  "status": "online",
  "service": "VibeTrust AI Guardian",
  "version": "1.0.0",
  "mode": "demo"
}
```

## 📡 API Endpoints

- `GET /` - Health check
- `POST /analyze` - Analyze AI content
- `GET /stats` - Dashboard statistics
- `GET /history` - Analysis history

## ⚙️ Files Configuration

✅ `render.yaml` - Render blueprint
✅ `manage.py` - Deployment wrapper
✅ `Procfile` - Start command
✅ `requirements.txt` - Python dependencies
✅ `runtime.txt` - Python 3.10.13
✅ `.slugignore` - Excludes frontend
✅ `backend/main.py` - FastAPI app

## 🎯 Next Steps After Deployment

1. Copy your Render URL
2. (Optional) Deploy frontend separately on Vercel/Netlify
3. Update frontend API URL to point to your Render backend

---

**MVP is ready to deploy! Follow Option 1 or Option 2 above.**
