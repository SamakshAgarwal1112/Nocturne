# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required to build pyaudio and other libraries, including PulseAudio and Qt
RUN apt-get update && apt-get install -y \
    ffmpeg \
    portaudio19-dev \
    libportaudio2 \
    build-essential \
    libatlas-base-dev \
    gcc \
    pulseaudio \
    qt5-qmake \
    qtbase5-dev \
    qtchooser \
    qtbase5-dev-tools \
    jackd2 \
    && rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy source files
COPY . .

# Set environment variables for PulseAudio access
ENV PULSE_SERVER=unix:/run/user/1000/pulse/native

# Run the main script
CMD ["python", "main.py"]