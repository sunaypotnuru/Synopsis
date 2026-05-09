---
title: NetraAI MCP Server
emoji: 🏥
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# 🏥 NetraAI MCP Server

Healthcare AI diagnostic tools with **11 MCP tools** for comprehensive medical screening and analysis.

## 🔬 Available MCP Tools

### **Diagnostic Tools**
1. **Anemia Detection** - Analyze conjunctiva images for anemia screening
2. **Cataract Detection** - Detect and grade cataracts from eye images  
3. **Diabetic Retinopathy** - Screen for DR from retinal images
4. **Mental Health Analysis** - Voice-based mental health assessment
5. **Parkinson's Screening** - Analyze drawings for Parkinson's indicators

### **Clinical Tools**
6. **FHIR Patient Data** - Retrieve patient information from FHIR systems
7. **Patient Timeline** - Query patient medical history and observations
8. **Diagnostic Comparison** - Compare diagnostic results over time
9. **Prior Authorization** - Generate prior auth requests for procedures
10. **Screening Workflow** - Orchestrate multi-step diagnostic workflows
11. **Health Check** - Server health and status monitoring

## 🚀 API Endpoints

### **Health Check**
```bash
GET /health
```

### **List All Tools**
```bash
GET /tools/list
```

### **Execute MCP Tool**
```bash
POST /tools/call
Content-Type: application/json
X-API-Key: [your-mcp-api-key]

{
  "name": "diagnose_anemia_tool",
  "arguments": {
    "image_url": "https://example.com/conjunctiva.jpg",
    "patient_id": "patient-123"
  }
}
```

## 🔐 Authentication

All API calls require authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-mcp-api-key" \
     https://sunay-potnuru-netra-mcp-server.hf.space/health
```

## 🏗️ Architecture

```
Frontend (Vercel) → Supabase Edge Function → MCP Server (HuggingFace) → ML Models (HuggingFace)
```

## 🔧 Environment Variables

The following environment variables are configured in the Space settings:

- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_KEY` - Database authentication  
- `MCP_API_KEY` - API authentication key
- `SENTRY_DSN` - Error monitoring
- `LIBRETRANSLATE_URL` - Translation service
- ML model service URLs (HuggingFace Spaces)

## 📊 ML Models Integration

This MCP server integrates with the following HuggingFace Spaces:

- **Anemia Detection**: `sunaypotnuru/netra-anemia`
- **Cataract Detection**: `sunaypotnuru/netra-cataract-detection`  
- **Diabetic Retinopathy**: `sunaypotnuru/netra-diabetic-retinopathy`
- **Mental Health**: `sunaypotnuru/netra-mental-health-voice-analysis`

## 🏥 Healthcare Compliance

- **HIPAA Compliant**: All patient data is encrypted and secure
- **FHIR R4 Compatible**: Supports standard healthcare data formats
- **Audit Logging**: All diagnostic actions are logged for compliance
- **FDA Guidelines**: Follows FDA guidance for AI/ML medical devices

## 🚀 Getting Started

1. **Health Check**: Visit `/health` to verify the server is running
2. **List Tools**: Call `/tools/list` to see all available diagnostic tools
3. **Execute Tool**: Use `/tools/call` with proper authentication to run diagnostics

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

This is part of the NetraAI healthcare platform. For issues or contributions, please contact the development team.

---

**🏥 Empowering Healthcare with AI - NetraAI MCP Server**