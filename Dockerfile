# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    portaudio19-dev \
    libportaudio2 \
    pulseaudio \
    && rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
COPY . .

# Set environment variables for audio access
ENV PULSE_SERVER unix:/run/user/1000/pulse/native

# Run the main script
CMD ["python", "main.py"]