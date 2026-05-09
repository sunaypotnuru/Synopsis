# FDA APM Monitoring Service Dockerfile
FROM python:3.11-slim

LABEL maintainer="NetraAI Team <dev@netraai.com>"
LABEL description="FDA APM AI Performance Monitoring Service"
LABEL version="2.0.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8010/health || exit 1

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8010

# Run the application
CMD ["python", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "4"]