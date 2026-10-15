# Multi-stage Dockerfile for Genome Firewall Backend

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY apps ./apps
COPY engine ./engine
COPY config ./config
COPY db ./db
COPY report ./report
COPY storage ./storage
COPY contracts ./contracts

# Expose API port
EXPOSE 8000

# Default command runs the API
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
