#!/bin/bash

echo "Setting up Driver Drowsiness Detection System..."

# Update package lists
sudo apt-get update

# Install Python and pip if not already installed
sudo apt-get install -y python3 python3-pip

# Install required system dependencies
sudo apt-get install -y \
    libatlas-base-dev \
    libjasper-dev \
    libcap-dev \
    libqtgui4 \
    libqt4-test \
    libhdf5-dev \
    libhdf5-serial-dev \
    libgtk2.0-dev \
    pkg-config \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libtbb2 \
    libtbb-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libdc1394-22-dev \
    libopenblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    gfortran \
    v4l-utils \
    python3-opencv \
    python3-picamera \
    alsa-utils \
    portaudio19-dev \
    build-essential \
    cmake

# Install Python packages
pip3 install -r requirements.txt

# Download face landmark predictor model and Phi-3 Mini Model
mkdir -p models
if [ ! -f models/shape_predictor_68_face_landmarks.dat ]; then
    echo "Downloading facial landmark predictor model..."
    wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2 -O models/shape_predictor_68_face_landmarks.dat.bz2
    bzip2 -d models/shape_predictor_68_face_landmarks.dat.bz2
fi

if [ ! -f models/Phi-3-mini-4k-instruct-q4.gguf ]; then
    echo "Downloading Phi-3 Mini model..."
    sudo wget https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf -P models/
fi

if [ ! -f models/piper/piper ]; then
    echo "Downloading Piper TTS..."
    sudo mkdir -p models/piper
    sudo wget https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_arm64.tar.gz -O models/piper/piper.tar.gz
    sudo tar -xzf models/piper/piper.tar.gz -C models/piper/
    sudo rm models/piper/piper.tar.gz
fi

if [ ! -f models/piper/model_voice.onnx ]; then
    echo "Downloading Piper voice model..."
    sudo wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/john/medium/en_US-john-medium.onnx -O models/piper/model_voice.onnx
fi

if [ ! -f models/piper/model_voice.onnx.json ]; then
    echo "Downloading Piper voice model json..."
    sudo wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/john/medium/en_US-john-medium.onnx.json -O models/piper/model_voice.onnx.json
fi

if [ ! -d models/vosk-model-small-en-us-0.15 ]; then
    echo "Downloading Vosk model..."
    sudo wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip -O models/vosk-model-small-en-us-0.15.zip
    sudo unzip models/vosk-model-small-en-us-0.15.zip -d models/
    sudo rm models/vosk-model-small-en-us-0.15.zip
fi

mkdir -p repos
cd repos/
if [ ! -d llama.cpp ]; then
    git clone https://github.com/ggerganov/llama.cpp
fi
cd llama.cpp
make clean
make CFLAGS="-march=armv8-a -O3"
cd ../../

# Create audio alert files
mkdir -p audio
# Generate audio alert files using Piper
echo "Generating audio alert files with Piper..."
piper_binary="models/piper/piper"
piper_model="models/piper/model_voice.onnx"

# Normal alert
echo "Are you feeling sleepy? Please respond." | $piper_binary --model $piper_model --output_file audio/alert_normal.wav

# Extreme alert
echo "You seem very drowsy. Respond to confirm you're awake." | $piper_binary --model $piper_model --output_file audio/alert_extreme.wav

# No face alert
echo "No driver detected. Please ensure you're in view." | $piper_binary --model $piper_model --output_file audio/alert_no_face.wav

# Success message
echo "Great! You are awake now. Stay alert." | $piper_binary --model $piper_model --output_file audio/alert_success.wav


print('Audio files generated successfully.')

# Test audio output
echo "Testing audio output..."
aplay /usr/share/sounds/alsa/Front_Center.wav

echo "Setup complete! Run 'python3 src/main.py' to start the system."