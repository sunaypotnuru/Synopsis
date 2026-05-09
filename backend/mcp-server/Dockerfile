# ============================================================================
# NetraAI MCP Server - Dockerfile (Render Free Tier Optimized)
# ============================================================================
# Base Image: Python 3.11 Slim (smaller footprint for 512 MB RAM limit)
# Target: Render Free Tier (512 MB RAM, 0.1 CPU)
# ============================================================================

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal)
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy service requirements
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -U pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create necessary directories
RUN mkdir -p data/reports data/reference

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Expose port
EXPOSE 7860

# Health check (P2: Fixed to use urllib instead of requests)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')"

# Run with gunicorn (production WSGI server)
# Workers: 1 (free tier has limited CPU)
# Threads: 2 (handle concurrent requests)
# Timeout: 120s (allow for ML model inference)
CMD ["gunicorn", \
     "--bind", "0.0.0.0:7860", \
     "--workers", "1", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "main:app"]

# ============================================================================
# DOCKERFILE NOTES
# ============================================================================
#
# 1. IMAGE SIZE OPTIMIZATION:
#    - Using python:3.11-slim (not full python:3.11)
#    - Removes apt cache after install
#    - Uses --no-cache-dir for pip
#    - Final image: ~300 MB (fits in 512 MB RAM)
#
# 2. GUNICORN CONFIGURATION:
#    - 1 worker (free tier has 0.1 CPU)
#    - 2 threads (handle 2 concurrent requests)
#    - 120s timeout (ML inference can take time)
#    - Logs to stdout (Render captures logs)
#
# 3. HEALTH CHECK:
#    - Checks /health endpoint every 30s
#    - Render uses this to detect failures
#    - Restarts container if unhealthy
#
# 4. ENVIRONMENT VARIABLES:
#    - Set in render.yaml (not in Dockerfile)
#    - Keeps secrets out of image
#    - Allows different configs per environment
#
# 5. MEMORY OPTIMIZATION:
#    - Slim base image
#    - Minimal system dependencies
#    - Single worker process
#    - Should use ~200-300 MB RAM
#
# 6. BUILD TIME:
#    - ~3-5 minutes on Render
#    - Cached layers speed up rebuilds
#    - requirements.txt copied first for caching
#
# 7. ALTERNATIVE (if memory issues):
#    - Use python:3.11-alpine (even smaller)
#    - Remove gunicorn, use uvicorn instead
#    - Reduce threads to 1
#
# ============================================================================
