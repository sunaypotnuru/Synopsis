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
- **Frontend**: Vercel (https://netra-ai-ten.vercel.app)
- **Backend API**: Hugging Face Spaces (this deployment)
- **ML Models**: Hugging Face Spaces (on sunay-potnuru account)

## Environment Variables
Ensure all variables from `temp/core-api/.env` are added to the Space Secrets.

## Deployment
1. Upload all files from `backend/core/`.
2. Port **7860** is automatically used.
