---
title: Netra AI Emergency Services
emoji: 🚑
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# Netra AI Emergency Services

This is the Emergency Services microservice for the Netra AI platform.

## Deployment to Hugging Face Spaces

1. Create a new Docker Space.
2. Upload all files from this folder.
3. Rename `Dockerfile.huggingface` to `Dockerfile`.
4. The Space will automatically build and start the service on port 7860.

## API Endpoints

- `GET /health`: Health check
- `POST /emergency/alert`: Trigger emergency alerts
