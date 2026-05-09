---
title: Netra AI Mental Health Chatbot
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# Netra AI Mental Health Chatbot

This is the Mental Health Chatbot microservice for the Netra AI platform.

## Deployment to Hugging Face Spaces

1. Create a new Docker Space.
2. Upload all files from this folder.
3. Rename `Dockerfile.huggingface` to `Dockerfile`.
4. The Space will automatically build and start the service on port 7860.

## API Endpoints

- `GET /health`: Health check
- `POST /chat`: Chat endpoint
