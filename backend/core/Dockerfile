# Dockerfile for Hugging Face Spaces Deployment
# Hugging Face Spaces uses port 7860 by default
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install setuptools
RUN pip install --no-cache-dir --upgrade pip==26.1 setuptools==75.1.0 wheel==0.44.0

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY migrations/ ./migrations/

# Set Python path
ENV PYTHONPATH=/app

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

# Run the application on port 7860 (Hugging Face default)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
