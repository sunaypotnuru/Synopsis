---
title: Netra AI Core API
emoji: 🏥
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: true
license: apache-2.0
---

# Netra AI Core Backend - Hugging Face Deployment

## Overview
This is the core backend API for Netra AI, deployed on Hugging Face Spaces using Docker.

## Architecture
- **Frontend**: Vercel (https://netra-ai.vercel.app)
- **Backend API**: Hugging Face Spaces (this deployment)
- **ML Models**: Hugging Face Spaces (6 separate services)
  - Anemia Detection
  - Cataract Detection
  - Diabetic Retinopathy Detection
  - Mental Health Analysis
  - Parkinson's Detection
  - MCP Server

## Environment Variables Required

### Database (Supabase)
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_postgres_connection_string
```

### ML Service URLs (Hugging Face Spaces)
```
ANEMIA_SERVICE_URL=https://your-space.hf.space
CATARACT_SERVICE_URL=https://your-space.hf.space
DR_SERVICE_URL=https://your-space.hf.space
MENTAL_HEALTH_SERVICE_URL=https://your-space.hf.space
PARKINSONS_SERVICE_URL=https://your-space.hf.space
MCP_SERVER_URL=https://your-space.hf.space
```

### API Configuration
```
FRONTEND_URL=https://netra-ai.vercel.app
ENVIRONMENT=production
API_V1_STR=/api/v1
BYPASS_AUTH=false
```

### Optional Services
```
SENTRY_DSN=your_sentry_dsn (optional)
DEEPSEEK_API_KEY=your_deepseek_key (optional)
OPENAI_API_KEY=your_openai_key (optional)
REDIS_URL=your_redis_url (optional)
```

## Deployment Steps

### 1. Create New Space on Hugging Face
1. Go to https://huggingface.co/new-space
2. Name: `netra-core-api`
3. SDK: **Docker**
4. Hardware: **CPU basic** (free tier)
5. Visibility: **Public** or **Private**

### 2. Set Environment Variables
In your Space settings, add all the environment variables listed above.

### 3. Upload Files
Upload these files to your Space:
- `Dockerfile` (from backend/core/)
- `app/` directory (entire backend/core/app/)
- `requirements-core.txt`
- `README_HUGGINGFACE.md` (this file)

### 4. Space Will Auto-Deploy
Hugging Face will automatically build and deploy your Docker container.

## Health Check
Once deployed, verify the API is running:
```bash
curl https://your-username-netra-core-api.hf.space/health
```

Expected response:
```json
{"status": "healthy"}
```

## API Documentation
Once deployed, access the interactive API docs at:
- Swagger UI: `https://your-space.hf.space/docs`
- ReDoc: `https://your-space.hf.space/redoc`

## Port Configuration
The API runs on port **7860** (Hugging Face Spaces default).
The Dockerfile has been configured to use this port.

## Troubleshooting

### Container Not Starting
- Check logs in Hugging Face Space
- Verify all required environment variables are set
- Ensure DATABASE_URL is accessible from Hugging Face

### Database Connection Issues
- Supabase: Ensure connection pooling is enabled
- Check if Supabase allows connections from Hugging Face IPs
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`

### ML Service Connection Issues
- Verify all ML service URLs are correct
- Ensure ML services are running on Hugging Face
- Check if services are public or require authentication

## Performance Notes
- Free tier CPU is sufficient for API routing
- Heavy ML processing is handled by separate ML services
- Consider upgrading to CPU upgrade or GPU if needed

## Security Notes
- Never commit `.env` files
- Use Hugging Face Secrets for sensitive data
- Keep SUPABASE_SERVICE_ROLE_KEY secure
- Enable CORS only for your frontend domain

## Support
For issues, check:
1. Hugging Face Space logs
2. Supabase logs
3. ML service health endpoints
4. Frontend console errors
