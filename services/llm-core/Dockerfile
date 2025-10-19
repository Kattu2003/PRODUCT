FROM python:3.11-slim

# Create a non-root user and set workdir
RUN useradd --create-home appuser
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8002
# CMD removed to allow docker-compose.yml to specify command
