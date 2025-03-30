FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    portaudio19-dev \
    libportaudio2 \
    build-essential \
    libatlas-base-dev \
    gcc \
    pulseaudio \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PULSE_SERVER=unix:/run/user/1000/pulse/native

CMD ["python", "main.py"]