FROM python:3.11

WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install setuptools to fix pkg_resources issue
RUN pip install --no-cache-dir --upgrade pip==26.1 setuptools==75.1.0 wheel==0.44.0

# NOTE: Build context is ./backend/services/parkinsons-voice in CI
# Copy service requirements
COPY requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Verify parselmouth installation
RUN python -c "import parselmouth; print('Parselmouth version:', parselmouth.__version__)"

# Copy application
COPY . .

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 7860

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
