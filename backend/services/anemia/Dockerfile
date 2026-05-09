FROM python:3.11
WORKDIR /app
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
# Copy service requirements
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -U pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 7860

# Command to run the application
ENV PYTHONPATH=/app/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
