import time
import threading
import pygame
import os
import json
import requests
import numpy as np
import sounddevice as sd
import webrtcvad
import noisereduce as nr
from queue import Queue
from gtts import gTTS
import speech_recognition as sr

class AudioAlerts:
    """
    Class to handle audio alerts for drowsiness detection with continuous playback,
    voice response detection, and Gemini API integration with acoustic echo cancellation
    """
    
    def __init__(self, normal_message="Hey, are you awake?", 
                 extreme_message="Alert! Wake up now!", 
                 volume=0.8,
                 gemini_api_key=None,
                 gemini_api_url="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"):
        """
        Initialize audio alerts
        
        Args:
            normal_message (str): Message for normal drowsiness level
            extreme_message (str): Message for extreme drowsiness level
            volume (float): Volume level (0.0 to 1.0)
            gemini_api_key (str): API key for Gemini API
            gemini_api_url (str): URL for Gemini API endpoint
        """
        self.normal_message = normal_message
        self.extreme_message = extreme_message
        self.volume = volume
        self.gemini_api_key = gemini_api_key
        self.gemini_api_url = gemini_api_url
        self.last_system_audio_time = 0
        self.is_playing_audio = False
        
        # Initialize pygame mixer
        pygame.mixer.init()
        pygame.mixer.set_num_channels(4)  # Added one more channel for Gemini responses
        
        # Set up channels
        self.normal_channel = pygame.mixer.Channel(0)
        self.extreme_channel = pygame.mixer.Channel(1)
        self.no_face_channel = pygame.mixer.Channel(2)
        self.gemini_channel = pygame.mixer.Channel(3)
        
        # Set up alert states
        self.normal_alert_active = False
        self.extreme_alert_active = False
        self.system_alert_active = False

        # Current drowsiness level
        self.current_drowsiness_level = "AWAKE"
        
        # Setup for acoustic echo cancellation
        self.sample_rate = 16000  # WebRTC VAD works best with 16kHz
        try:
            self.vad = webrtcvad.Vad(3)  # Aggressiveness level 3 (0-3)
        except Exception as e:
            print(f"Warning: Could not initialize WebRTC VAD: {e}")
            self.vad = None
        
        # Buffer to store system audio for echo reference
        self.audio_buffer = Queue()
        
        # Setup audio output monitoring
        self.audio_output_thread = None
        self.stop_audio_monitoring = False
        
        # Initialize voice recognition with better parameters
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Setup audio monitoring for echo cancellation
        self._setup_audio_monitoring()
        
        # Calibrate recognizer for ambient noise
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source)
        
        # Enhanced recognition parameters
        self.recognizer.energy_threshold = 1000  # Higher value for energy threshold
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8  # Shorter pause threshold
        self.recognizer.phrase_threshold = 0.3  # Better for short responses
        
        # Thread for voice detection
        self.voice_detection_thread = None
        self.stop_voice_detection = False
        
        # Store recent system messages for echo cancellation
        self.recent_system_messages = []
        
        # Generate audio files if they don't exist
        self._generate_audio_files()
    
    def _setup_audio_monitoring(self):
        """Setup audio monitoring for echo cancellation"""
        try:
            # List audio devices
            devices = sd.query_devices()
            
            # Find default output device
            output_device = None
            for i, device in enumerate(devices):
                if device['max_output_channels'] > 0 and sd.default.device[1] == i:
                    output_device = i
                    break
            
            if output_device is not None:
                # Start monitoring thread
                self.audio_output_thread = threading.Thread(
                    target=self._monitor_audio_output, 
                    args=(output_device,),
                    daemon=True
                )
                self.audio_output_thread.start()
                print("Audio output monitoring started")
            else:
                print("Couldn't find suitable output device for monitoring")
        except Exception as e:
            print(f"Error setting up audio monitoring: {e}")
    
    def _monitor_audio_output(self, device_id):
        """Monitor audio output for echo cancellation reference"""
        try:
            def callback(outdata, frames, time, status):
                if self.is_playing_audio and outdata.any():
                    # Store a copy of played audio for echo reference
                    self.audio_buffer.put(outdata.copy())
            
            # Start output stream
            with sd.OutputStream(device=device_id, 
                              channels=1, 
                              callback=callback,
                              samplerate=self.sample_rate):
                while not self.stop_audio_monitoring:
                    sd.sleep(100)
        except Exception as e:
            print(f"Error in audio monitoring: {e}")
    
    def _generate_audio_files(self):
        """Generate audio files for alerts using gTTS"""
        # Create audio directory if it doesn't exist
        audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        # Generate normal alert audio
        normal_audio_path = os.path.join(audio_dir, "alert_normal.mp3")
        if not os.path.exists(normal_audio_path) or True:  # Always regenerate for testing
            tts = gTTS(text=self.normal_message, lang='en')
            tts.save(normal_audio_path)
        
        # Generate extreme alert audio
        extreme_audio_path = os.path.join(audio_dir, "alert_extreme.mp3")
        if not os.path.exists(extreme_audio_path) or True:  # Always regenerate for testing
            tts = gTTS(text=self.extreme_message, lang='en')
            tts.save(extreme_audio_path)
        
        # Load audio files
        self.normal_alert_sound = pygame.mixer.Sound(normal_audio_path)
        self.extreme_alert_sound = pygame.mixer.Sound(extreme_audio_path)
        
        # Set volume
        self.normal_alert_sound.set_volume(self.volume)
        self.extreme_alert_sound.set_volume(self.volume)
        
        # Add system messages to the recent messages list for echo cancellation
        self.recent_system_messages.append(self.normal_message.lower())
        self.recent_system_messages.append(self.extreme_message.lower())
    
    def _generate_temp_audio(self, message):
        """Generate a temporary audio file with the given message"""
        audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
        temp_audio_path = os.path.join(audio_dir, "temp_response.mp3")
        
        # Flag that we're about to play audio
        self.is_playing_audio = True
        self.last_system_audio_time = time.time()
        
        tts = gTTS(text=message, lang='en')
        tts.save(temp_audio_path)
        
        temp_sound = pygame.mixer.Sound(temp_audio_path)
        temp_sound.set_volume(self.volume)
        
        # Add this message to recent system messages for echo cancellation
        self.recent_system_messages.append(message.lower())
        # Keep only last 5 messages to avoid memory bloat
        if len(self.recent_system_messages) > 5:
            self.recent_system_messages.pop(0)
            
        return temp_sound
    
    def _send_to_gemini_api(self, user_speech, drowsiness_level):
        """
        Send user speech and drowsiness level to Gemini API
        
        Args:
            user_speech (str): User's speech transcript
            drowsiness_level (str): Current drowsiness level
            
        Returns:
            dict: Parsed JSON response from Gemini API
        """
        if not self.gemini_api_key:
            print("Warning: Gemini API key not provided. Skipping API call.")
            return {"convinced": False, "message": "API key not provided. Please set up the Gemini API key."}
            
        prompt = f"""
        Analyze the following driver response and drowsiness status:
        
        Driver's current drowsiness level: {drowsiness_level}
        Driver's voice response: "{user_speech}"
        
        Determine if this response convincingly indicates the driver is alert and no longer drowsy.
        Output only a JSON object with two fields:
        1. "convinced": a boolean (true/false) indicating if you're convinced the driver is alert
        2. "message": if not convinced, include a brief message explaining what the driver should do
        In case of not convinced, make sure to generate a human sounding response message to create familiarity with the human driver. Keep the message short and clear.
        
        Example response if convinced:
        {{"convinced": true}}
        
        Example response if not convinced:
        {{"convinced": false, "message": "Hey Bud, you don't seem very focused. Can you count from 20 to 30?"}}
        """
        
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "topK": 40
            }
        }
        
        url = f"{self.gemini_api_url}?key={self.gemini_api_key}"
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            # Parse the response
            resp_json = response.json()
            text_response = resp_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            # Extract the JSON part from the text response
            try:
                # Find JSON in the response (it might be mixed with other text)
                start_idx = text_response.find('{')
                end_idx = text_response.rfind('}') + 1
                
                if start_idx >= 0 and end_idx > 0:
                    json_str = text_response[start_idx:end_idx]
                    result = json.loads(json_str)
                    return result
                else:
                    return {"convinced": False, "message": "Could not parse Gemini API response."}
            except json.JSONDecodeError:
                return {"convinced": False, "message": "Could not parse Gemini API response."}
                
        except requests.exceptions.RequestException as e:
            print(f"Error calling Gemini API: {e}")
            return {"convinced": False, "message": "Error communicating with Gemini API."}
    
    def _is_system_audio_echo(self, text):
        """
        Enhanced echo detection that combines multiple techniques
        
        Args:
            text (str): Recognized text to check
            
        Returns:
            bool: True if the text matches a recent system message, False otherwise
        """
        text_lower = text.lower()
        
        # Track when the last system message was played
        current_time = time.time()
        if current_time - self.last_system_audio_time < 2.0:
            # If recognized text came too soon after system speech, it's likely echo
            echo_probability = 0.8
        else:
            echo_probability = 0.0
        
        # Check for word similarity with recent system messages
        for message in self.recent_system_messages:
            # Check for exact matches
            if message in text_lower:
                return True
            
            # Word-level similarity matching
            message_words = set(message.split())
            text_words = set(text_lower.split())
            
            if len(message_words) == 0:
                continue
                
            common_words = message_words.intersection(text_words)
            similarity = len(common_words) / len(message_words) if len(message_words) > 0 else 0
            
            # Adjust probability based on similarity
            if similarity > 0.5:
                echo_probability += 0.3
            
            # Short texts need higher similarity thresholds
            if len(message_words) < 3 and similarity < 0.8:
                echo_probability -= 0.2
        
        # If detected any trigger words that weren't in system messages
        driver_attention_words = ["yes", "okay", "i'm", "sure", "hey", "hi", "hello", "awake", "focused"]
        if any(word in text_lower for word in driver_attention_words):
            echo_probability -= 0.3
        
        # Final decision
        return echo_probability > 0.5
    
    def _process_voice_with_gemini(self, audio):
        """Process voice input with Gemini API with echo cancellation"""
        try:
            # Convert audio to numpy array for processing if possible
            try:
                audio_data = np.frombuffer(audio.frame_data, dtype=np.int16)
                
                # Apply echo cancellation if we have reference audio
                if not self.audio_buffer.empty():
                    # Collect reference audio samples
                    reference_chunks = []
                    while not self.audio_buffer.empty():
                        reference_chunks.append(self.audio_buffer.get())
                    
                    if reference_chunks:
                        # Combine chunks
                        reference_audio = np.vstack(reference_chunks)
                        
                        # Perform echo cancellation
                        try:
                            processed_audio = nr.reduce_noise(
                                y=audio_data, 
                                sr=self.sample_rate,
                                y_noise=reference_audio.flatten()
                            )
                            
                            # Create new audio data
                            processed_audio_bytes = processed_audio.astype(np.int16).tobytes()
                            # Create new AudioData object
                            audio = sr.AudioData(
                                processed_audio_bytes, 
                                self.sample_rate, 
                                audio.sample_width
                            )
                        except Exception as e:
                            print(f"Echo cancellation processing error: {e}")
                
                # Perform voice activity detection if available
                if self.vad:
                    frames = []
                    for i in range(0, len(audio_data), 320):  # 20ms frames at 16kHz
                        if i + 320 <= len(audio_data):
                            frames.append(audio_data[i:i+320])
                    
                    # Only proceed if enough frames have voice activity
                    voice_frames = 0
                    for frame in frames:
                        if len(frame) == 320:  # Valid frame size
                            try:
                                if self.vad.is_speech(frame.tobytes(), self.sample_rate):
                                    voice_frames += 1
                            except Exception as e:
                                print(f"VAD error: {e}")
                    
                    voice_percentage = voice_frames / len(frames) if frames else 0
                    
                    if voice_percentage < 0.3:  # Less than 30% of frames contain speech
                        print("No significant speech detected in audio")
                        return False
            except Exception as e:
                print(f"Warning: Audio processing failed, falling back to basic recognition: {e}")
            
            # Convert speech to text
            user_speech = self.recognizer.recognize_google(audio)
            print(f"Raw recognized text: {user_speech}")
            
            # Check if this is just the system's own audio being picked up
            if self._is_system_audio_echo(user_speech):
                print("Detected system's own audio output, ignoring and continuing to listen")
                return False
            
            print(f"User said: {user_speech}")
            
            # Send to Gemini API
            gemini_response = self._send_to_gemini_api(user_speech, self.current_drowsiness_level)
            self.system_alert_active = True

            # Process response
            if gemini_response.get("convinced", False):
                print("System is convinced the driver is alert.")
                self.stop_all_alerts()
                
                # Play confirmation message
                confirm_sound = self._generate_temp_audio("You seem alert now. Drive safely.")
                self.gemini_channel.play(confirm_sound)
                return True
            else:
                # Play custom message from Gemini
                message = gemini_response.get("message", "I'm not convinced you're fully alert. Please continue focusing.")
                print(f"Gemini response: {message}")
                
                response_sound = self._generate_temp_audio(message)
                self.stop_all_alerts()
                self.gemini_channel.play(response_sound)
                # Keep alerts active
                return False
                
        except sr.UnknownValueError:
            print("Could not understand audio")
            return False
        except sr.RequestError as e:
            print(f"Could not request results: {e}")
            return False
        except Exception as e:
            print(f"Error processing voice with Gemini: {e}")
            return False
    
    def _listen_for_response(self):
        """Listen for voice response with echo cancellation"""
        print("Voice detection started with echo cancellation")
        self.stop_voice_detection = False
        
        while not self.stop_voice_detection:
            try:
                # Wait until all audio playback has finished
                while (self.normal_channel.get_busy() or 
                       self.extreme_channel.get_busy() or 
                       self.gemini_channel.get_busy() or
                       self.no_face_channel.get_busy()):
                    time.sleep(0.1)
                    if self.stop_voice_detection:
                        return
                
                # Set flag when we're not playing audio
                self.is_playing_audio = False
                
                # Add a buffer time after playback ends
                time.sleep(0.8)  # Buffer time after audio ends
                
                # Clear any stale audio from buffer
                while not self.audio_buffer.empty():
                    self.audio_buffer.get()
                
                # Stop all channels to ensure they're not playing
                self.normal_channel.stop()
                self.extreme_channel.stop()
                self.gemini_channel.stop()
                self.no_face_channel.stop()
                
                with self.microphone as source:
                    print("Listening for driver response...")
                    # Adjust for ambient noise before each listening session
                    self.recognizer.adjust_for_ambient_noise(source, duration=1.0)
                    audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=6.0)
                    
                # Process with echo cancellation and Gemini
                is_alert = self._process_voice_with_gemini(audio)
                if is_alert:
                    self.system_alert_active = False
                    break
                    
            except sr.WaitTimeoutError:
                # Just timeout, continue listening
                print("No response detected, continuing to listen...")
            except Exception as e:
                print(f"Error in voice detection: {e}")
            
            time.sleep(0.1)
    
    def start_voice_detection(self):
        """Start voice detection in a separate thread"""
        if (self.voice_detection_thread is None or not self.voice_detection_thread.is_alive()) and not self.system_alert_active:
            # Create a new thread for voice detection
            self.voice_detection_thread = threading.Thread(target=self._listen_for_response, daemon=True)
            self.voice_detection_thread.start()
    
    def stop_voice_detection(self):
        """Stop voice detection thread"""
        self.stop_voice_detection = True
        if self.voice_detection_thread and self.voice_detection_thread.is_alive():
            self.voice_detection_thread.join(timeout=1.0)
    
    def play_normal_alert(self):
        """Start playing normal alert"""
        if not self.normal_alert_active and not self.extreme_alert_active and not self.system_alert_active:
            self.normal_alert_active = True
            self.normal_channel.play(self.normal_alert_sound, loops=0)  # Play once, not looping
            self.is_playing_audio = True
            self.last_system_audio_time = time.time()
            # Start voice detection after alert (it'll wait for playback to finish)
            self.start_voice_detection()
    
    def play_extreme_alert(self):
        """Start playing extreme alert"""
        # Stop normal alert if playing
        if (not self.normal_channel.get_busy()):
            if self.normal_alert_active:
                self.normal_channel.stop()
                self.normal_alert_active = False
            
            if not self.extreme_alert_active and not self.system_alert_active:
                self.extreme_alert_active = True
                self.extreme_channel.play(self.extreme_alert_sound, loops=0)  # Play once, not looping
                self.is_playing_audio = True
                self.last_system_audio_time = time.time()
                # Start voice detection after alert (it'll wait for playback to finish)
                self.start_voice_detection()
        
    def stop_normal_alert(self):
        """Stop normal alert if playing"""
        if self.normal_alert_active:
            self.normal_channel.stop()
            self.normal_alert_active = False
    
    def stop_extreme_alert(self):
        """Stop extreme alert if playing"""
        if self.extreme_alert_active:
            self.extreme_channel.stop()
            self.extreme_alert_active = False
    
    def stop_all_alerts(self):
        """Stop all alerts"""
        self.stop_normal_alert()
        self.stop_extreme_alert()
        self.is_playing_audio = False
        # Clear audio buffer
        while not self.audio_buffer.empty():
            self.audio_buffer.get()
    
    def update(self, drowsiness_level):
        """
        Update alerts based on current drowsiness level
        
        Args:
            drowsiness_level (str): Current drowsiness level ("AWAKE", "NORMAL", or "EXTREME")
        """
        # Store current drowsiness level for use with Gemini API
        self.current_drowsiness_level = drowsiness_level
        
        if drowsiness_level == "EXTREME":
            self.play_extreme_alert()
        elif drowsiness_level == "NORMAL":
            self.play_normal_alert()
        else:  # AWAKE
            self.stop_all_alerts()
    
    def cleanup(self):
        """Clean up resources"""
        self.stop_voice_detection = True
        self.stop_audio_monitoring = True
        if self.audio_output_thread and self.audio_output_thread.is_alive():
            self.audio_output_thread.join(1.0)
        self.stop_all_alerts()
        pygame.mixer.quit()

    def play_no_face_alert(self, message="No face detected! Please position yourself in front of the camera."):
        """
        Play a one-time alert when no face is detected
        
        Args:
            message (str): Message to play when no face is detected
        """
        # Create audio directory if it doesn't exist
        audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        # Generate no face alert audio
        no_face_audio_path = os.path.join(audio_dir, "alert_no_face.mp3")
        tts = gTTS(text=message, lang='en')
        tts.save(no_face_audio_path)
        
        # Add to recent messages for echo cancellation
        self.recent_system_messages.append(message.lower())
        if len(self.recent_system_messages) > 5:
            self.recent_system_messages.pop(0)
        
        # Play the alert once (not looping)
        no_face_sound = pygame.mixer.Sound(no_face_audio_path)
        no_face_sound.set_volume(self.volume)
        self.is_playing_audio = True
        self.last_system_audio_time = time.time()
        
        # Use channel for the no-face alert
        self.no_face_channel.play(no_face_sound)