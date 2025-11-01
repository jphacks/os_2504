# Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code into /app/backend so the package name remains `backend`
COPY . ./backend

ENV PYTHONPATH=/app

# Expose port (Cloud Run uses PORT environment variable, defaults to 8080)
EXPOSE 8080

# Run the application
# Use PORT environment variable if set, otherwise default to 8080
WORKDIR /app/backend
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}
