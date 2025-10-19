FROM python:3.11-slim

# Create a non-root user (optional) and set workdir
RUN useradd --create-home appuser
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8001
# CMD removed to allow docker-compose.yml to specify command
