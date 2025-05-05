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
import subprocess
from vosk import Model, KaldiRecognizer
import random

class AudioAlerts:
    """
    Class to handle audio alerts for drowsiness detection with continuous playback,
    voice response detection, and Gemini API integration with acoustic echo cancellation
    """
    
    def __init__(self, normal_message="Hey, are you awake?", 
                 extreme_message="Alert! Wake up now!", 
                 volume=0.8,
                 gemini_api_key=None,
                 gemini_api_url="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
                 relevant_topics_file='/tmp/relevant_driver_topics.txt',
                 piper_binary="models/piper/piper/piper",   
                 piper_model="models/piper/model_voice.onnx",
                 vosk_model="models/vosk-model-small-en-us-0.15"):
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
        self.relevant_topics_file = relevant_topics_file
        self.piper_binary = os.path.join(os.path.dirname(os.path.abspath(os.getcwd())), "prediction", piper_binary)
        self.piper_model = os.path.join(os.path.dirname(os.path.abspath(os.getcwd())), "prediction", piper_model)
        self.vosk_model = os.path.join(os.path.dirname(os.path.abspath(os.getcwd())), "prediction", vosk_model)
        self.last_system_audio_time = 0
        self.is_playing_audio = False
        self.context_file = '/tmp/driver_context.json'
        self._initialize_context()

        # Initialize Vosk model for speech recognition
        self.model = Model(self.vosk_model)
        
        # Initialize pygame mixer
        pygame.mixer.init()
        pygame.mixer.set_num_channels(4)
        
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
        
        # Thread for voice detection
        self.voice_detection_thread = None
        self.stop_voice_detection = False
        
        # Store recent system messages for echo cancellation
        self.recent_system_messages = []
        
        # Conversation history for context
        self.conversation_history = []
        
        # Generate audio files using Piper binary
        self._generate_audio_files()

    def _initialize_context(self):
        """Initialize or load driver context"""
        if not os.path.exists(self.context_file):
            initial_context = {
                "conversation_history": [],  # List of {role, content, timestamp}
                "driver_details": {
                    "name": "",
                    "family": {},  # e.g., {"wife": "saree_request", "son": "Shyaam, board exams"}
                    "preferences": {},  # e.g., {"music": "old melodies", "singer": "Mohammad Rafi"}
                    "past_events": {}  # e.g., {"destination": "Mangalore", "payment": "electricity bill"}
                }
            }
            with open(self.context_file, 'w') as f:
                json.dump(initial_context, f, indent=2)
    
    def _load_context(self):
        """Load context from file"""
        try:
            with open(self.context_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading context: {e}")
            return {"conversation_history": [], "driver_details": {}}
    
    def _save_context(self, context):
        """Save context to file"""
        try:
            with open(self.context_file, 'w') as f:
                json.dump(context, f, indent=2)
        except Exception as e:
            print(f"Error saving context: {e}")
    
    def _summarize_context(self):
        """Summarize driver details for prompt"""
        context = self._load_context()
        details = context["driver_details"]
        summary = []
        if details.get("name"):
            summary.append(f"Driver: {details['name']}")
        if details.get("family"):
            family = ", ".join([f"{k}: {v}" for k, v in details["family"].items()])
            summary.append(f"Family: {family}")
        if details.get("preferences"):
            prefs = ", ".join([f"{k}: {v}" for k, v in details["preferences"].items()])
            summary.append(f"Preferences: {prefs}")
        if details.get("past_events"):
            events = ", ".join([f"{k}: {v}" for k, v in details["past_events"].items()])
            summary.append(f"Recent: {events}")
        return "; ".join(summary) if summary else "No context available"
    
    def _setup_audio_monitoring(self):
        """Setup audio monitoring for echo cancellation"""
        try:
            devices = sd.query_devices()
            output_device = None
            for i, device in enumerate(devices):
                if device['max_output_channels'] > 0 and sd.default.device[1] == i:
                    output_device = i
                    break
            
            if output_device is not None:
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
                    self.audio_buffer.put(outdata.copy())
            
            with sd.OutputStream(device=device_id, 
                              channels=1, 
                              callback=callback,
                              samplerate=self.sample_rate):
                while not self.stop_audio_monitoring:
                    sd.sleep(100)
        except Exception as e:
            print(f"Error in audio monitoring: {e}")

    def _update_status_file(self, status):
        """Write status to /tmp/drowsiness_status.txt"""
        try:
            with open('/tmp/drowsiness_status.txt', 'w') as f:
                f.write(status)
        except Exception as e:
            print(f"Error writing to status file: {e}")
    
    def _generate_audio_files(self):
        """Generate audio files for alerts using Piper binary"""
        audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        # Verify Piper binary and model exist
        if not os.path.isfile(self.piper_binary):
            raise FileNotFoundError(f"Piper binary not found at {self.piper_binary}")
        if not os.path.isfile(self.piper_model):
            raise FileNotFoundError(f"Piper model not found at {self.piper_model}")
        
        for name, message in [("normal", self.normal_message), ("extreme", self.extreme_message)]:
            output_file = os.path.join(audio_dir, f"alert_{name}.wav")
            command = f'echo "{message}" | {self.piper_binary} --model {self.piper_model} --output_file {output_file}'
            try:
                result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
                print(f"Generated {output_file} successfully")
            except subprocess.SubprocessError as e:
                error_msg = f"Failed to generate audio for {name}: {e}\nStderr: {e.stderr if hasattr(e, 'stderr') else 'N/A'}"
                print(error_msg)
                raise RuntimeError(error_msg)
            
            # Verify the output file exists
            if not os.path.isfile(output_file):
                raise FileNotFoundError(f"Audio file {output_file} was not created by Piper")
            
            # Load the sound with pygame
            try:
                sound = pygame.mixer.Sound(output_file)
                sound.set_volume(self.volume)
                setattr(self, f"{name}_alert_sound", sound)
                print(f"Loaded {name}_alert_sound successfully")
            except pygame.error as e:
                raise RuntimeError(f"Failed to load {output_file} with pygame: {e}")
            
            self.recent_system_messages.append(message.lower())
    
    def _generate_temp_audio(self, message):
        """Generate a temporary audio file with the given message using Piper binary"""
        audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
        temp_audio_path = os.path.join(audio_dir, "temp_response.wav")
        
        self.is_playing_audio = True
        self.last_system_audio_time = time.time()
        
        command = f'echo "{message}" | {self.piper_binary} --model {self.piper_model} --output_file {temp_audio_path}'
        try:
            subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
            print(f"Generated temporary audio: {temp_audio_path}")
        except subprocess.SubprocessError as e:
            print(f"Error generating temp audio: {e}\nStderr: {e.stderr if hasattr(e, 'stderr') else 'N/A'}")
            return None
        
        # Verify the output file exists
        if not os.path.isfile(temp_audio_path):
            print(f"Error: Temporary audio file {temp_audio_path} was not created")
            return None
        
        try:
            temp_sound = pygame.mixer.Sound(temp_audio_path)
            temp_sound.set_volume(self.volume)
        except pygame.error as e:
            print(f"Error loading temporary audio with pygame: {e}")
            return None
        
        self.recent_system_messages.append(message.lower())
        if len(self.recent_system_messages) > 5:
            self.recent_system_messages.pop(0)
            
        return temp_sound
    
    def _store_topic(self, topic):
        """
        Store a detected topic in the topics file
        
        Args:
            topic (str): Topic to store
        """
        try:
            # Read existing topics
            existing_topics = []
            if os.path.exists(self.relevant_topics_file):
                with open(self.relevant_topics_file, 'r') as f:
                    existing_topics = [line.strip() for line in f if line.strip()]
            
            # Add new topic if not already present
            if topic and topic not in existing_topics:
                existing_topics.append(topic)
            
            # Write updated topics to file
            with open(self.relevant_topics_file, 'w') as f:
                for t in existing_topics:
                    f.write(f"{t}\n")
            print(f"Updated topics in {self.relevant_topics_file}: {existing_topics}")
        except Exception as e:
            print(f"Error writing to topics file: {e}")
    
    def _get_random_topic(self):
        """
        Get a random topic from the topics file if it exists and is not empty
        
        Returns:
            str: Random topic or None if file is empty or doesn't exist
        """
        try:
            if os.path.exists(self.relevant_topics_file):
                with open(self.relevant_topics_file, 'r') as f:
                    topics = [line.strip() for line in f if line.strip()]
                if topics:
                    return random.choice(topics)
        except Exception as e:
            print(f"Error reading topics file: {e}")
        return None
    
    def _send_to_gemini_api(self, user_speech, drowsiness_level):
        if not self.gemini_api_key:
            return {"convinced": False, "message": "API key missing.", "topic": ""}
        
        # Load and update context
        context = self._load_context()
        if user_speech:
            context["conversation_history"].append({
                "role": "user",
                "content": user_speech,
                "timestamp": time.time()
            })
            # Limit history to last 2 exchanges to avoid bloat
            context["conversation_history"] = context["conversation_history"][-2:]
        
        # Summarize context
        context_summary = self._summarize_context()
        selected_topic = self._get_random_topic() or ""
        
        # Streamlined prompt
        prompt = f"""
        Drowsiness: {drowsiness_level}
        Context: {context_summary}
        Topic: {selected_topic}
        Driver: "{user_speech}"

        Assess alertness. If not alert, respond with a short (1-2 lines), engaging message to keep them talking, using a friendly, natural tone. Identify a 1-2 word topic if enthusiastic, else "". Return JSON: {{"convinced": bool, "message": str, "topic": str}}.
        Examples:
        {{"convinced": true, "message": "", "topic": ""}}
        {{"convinced": false, "message": "Sleepy? What's your favorite road trip?", "topic": "road trips"}}
        """
        print(prompt)
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4, "topP": 0.9, "topK": 40}
        }
        url = f"{self.gemini_api_url}?key={self.gemini_api_key}"
        
        try:
            self._update_status_file("SYSTEM")
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            resp_json = response.json()
            text_response = resp_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            # Parse JSON response
            start_idx = text_response.find('{')
            end_idx = text_response.rfind('}') + 1
            if start_idx >= 0 and end_idx > 0:
                result = json.loads(text_response[start_idx:end_idx])
                # Update driver details with new topic
                topic = result.get("topic", "")
                if topic:
                    context["driver_details"]["preferences"][topic] = topic
                    self._store_topic(topic)
                # Save system response
                if not result.get("convinced", False):
                    context["conversation_history"].append({
                        "role": "system",
                        "content": result.get("message", ""),
                        "timestamp": time.time()
                    })
                self._save_context(context)
                return result
            return {"convinced": False, "message": "Parse error.", "topic": ""}
        except requests.exceptions.RequestException as e:
            print(f"Gemini API error: {e}")
            return {"convinced": False, "message": "Please restart.", "topic": ""}
    
    def _is_system_audio_echo(self, text):
        """
        Enhanced echo detection that combines multiple techniques
        
        Args:
            text (str): Recognized text to check
            
        Returns:
            bool: True if the text matches a recent system message, False otherwise
        """
        text_lower = text.lower()
        
        current_time = time.time()
        if current_time - self.last_system_audio_time < 2.0:
            echo_probability = 0.8
        else:
            echo_probability = 0.0
        
        for message in self.recent_system_messages:
            if message in text_lower:
                return True
            
            message_words = set(message.split())
            text_words = set(text_lower.split())
            
            if len(message_words) == 0:
                continue
                
            common_words = message_words.intersection(text_words)
            similarity = len(common_words) / len(message_words) if len(message_words) > 0 else 0
            
            if similarity > 0.5:
                echo_probability += 0.3
            
            if len(message_words) < 3 and similarity < 0.8:
                echo_probability -= 0.2
        
        driver_attention_words = ["yes", "okay", "i'm", "sure", "hey", "hi", "hello", "awake", "focused"]
        if any(word in text_lower for word in driver_attention_words):
            echo_probability -= 0.3
        
        return echo_probability > 0.5
    
    def _process_voice_with_gemini(self, audio_data):
        """Process voice input with Gemini API with echo cancellation"""
        try:
            # Apply echo cancellation if reference audio is available
            if not self.audio_buffer.empty():
                reference_chunks = []
                while not self.audio_buffer.empty():
                    reference_chunks.append(self.audio_buffer.get())
                
                if reference_chunks:
                    reference_audio = np.vstack(reference_chunks)
                    try:
                        processed_audio = nr.reduce_noise(
                            y=audio_data, 
                            sr=self.sample_rate,
                            y_noise=reference_audio.flatten()
                        )
                        audio_data = processed_audio
                    except Exception as e:
                        print(f"Echo cancellation processing error: {e}")
            
            # Perform voice activity detection if available
            if self.vad:
                frames = []
                for i in range(0, len(audio_data), 320):
                    if i + 320 <= len(audio_data):
                        frames.append(audio_data[i:i+320])
                
                voice_frames = 0
                for frame in frames:
                    if len(frame) == 320:
                        try:
                            if self.vad.is_speech(frame.astype(np.int16).tobytes(), self.sample_rate):
                                voice_frames += 1
                        except Exception as e:
                            print(f"VAD error: {e}")
                
                voice_percentage = voice_frames / len(frames) if frames else 0
                if voice_percentage < 0.3:
                    print("No significant speech detected in audio")
                    return False
            
            # Process audio with Vosk
            recognizer = KaldiRecognizer(self.model, self.sample_rate)
            recognizer.AcceptWaveform(audio_data.astype(np.int16).tobytes())
            result = recognizer.Result()
            user_speech = json.loads(result).get("text", "")
            print(f"Raw recognized text: {user_speech}")
            
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
                self.conversation_history = []  # Reset conversation history
                # Play confirmation message
                confirm_sound = self._generate_temp_audio("You seem alert now. Drive safely.")
                if confirm_sound:
                    self.stop_all_alerts()
                    self.gemini_channel.stop()
                    self.gemini_channel.play(confirm_sound)
                return True
            else:
                # Play custom message from Gemini
                message = gemini_response.get("message", "I'm not convinced you're fully alert. Please continue focusing.")
                print(f"Gemini response: {message}")
                
                response_sound = self._generate_temp_audio(message)
                if response_sound:
                    self.stop_all_alerts()
                    self.gemini_channel.play(response_sound)
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
                        self._update_status_file(self.current_drowsiness_level)
                        return
                
                self.is_playing_audio = False
                time.sleep(0.8)
                
                # Clear audio buffer
                while not self.audio_buffer.empty():
                    self.audio_buffer.get()
                
                # Stop all channels
                self.normal_channel.stop()
                self.extreme_channel.stop()
                self.gemini_channel.stop()
                self.no_face_channel.stop()
                
                self._update_status_file("LISTENING")
                # Capture audio using sounddevice
                print("Listening for driver response...")
                audio_data = sd.rec(
                    int(6.0 * self.sample_rate),  # Record for max 6 seconds
                    samplerate=self.sample_rate,
                    channels=1,
                    dtype='int16'
                )
                sd.wait()  # Wait until recording is finished
                
                # Process the captured audio
                is_alert = self._process_voice_with_gemini(audio_data.flatten())
                if is_alert:
                    self.system_alert_active = False
                    break
                    
            except Exception as e:
                print(f"Error in voice detection: {e}")
            
            time.sleep(0.1)
    
    def start_voice_detection(self):
        """Start voice detection in a separate thread"""
        if (self.voice_detection_thread is None or not self.voice_detection_thread.is_alive()) and not self.system_alert_active:
            self.voice_detection_thread = threading.Thread(target=self._listen_for_response, daemon=True)
            self.voice_detection_thread.start()
    
    def stop_voice_detection(self):
        """Stop voice detection thread"""
        self.stop_voice_detection = True
        if self.voice_detection_thread and self.voice_detection_thread.is_alive():
            self.voice_detection_thread.join(timeout=1.0)
    
    def play_normal_alert(self):
        """Start playing normal alert"""
        if not self.normal_alert_active and not self.extreme_alert_active and not self.system_alert_active and not self.gemini_channel.get_busy():
            if not hasattr(self, 'normal_alert_sound'):
                print("Error: normal_alert_sound not initialized. Cannot play normal alert.")
                return
            self.gemini_channel.stop()
            self.normal_alert_active = True
            self.normal_channel.play(self.normal_alert_sound, loops=0)
            self.is_playing_audio = True
            self.last_system_audio_time = time.time()
            self.start_voice_detection()
    
    def play_extreme_alert(self):
        """Start playing extreme alert"""
        if not self.normal_channel.get_busy():
            if self.normal_alert_active:
                self.normal_channel.stop()
                self.normal_alert_active = False
            
            if not self.extreme_alert_active and not self.system_alert_active and not self.gemini_channel.get_busy():
                if not hasattr(self, 'extreme_alert_sound'):
                    print("Error: extreme_alert_sound not initialized. Cannot play extreme alert.")
                    return
                self.gemini_channel.stop()
                self.extreme_alert_active = True
                self.extreme_channel.play(self.extreme_alert_sound, loops=0)
                self.is_playing_audio = True
                self.last_system_audio_time = time.time()
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
        while not self.audio_buffer.empty():
            self.audio_buffer.get()
    
    def update(self, drowsiness_level):
        """
        Update alerts based on current drowsiness level
        
        Args:
            drowsiness_level (str): Current drowsiness level ("AWAKE", "NORMAL", or "EXTREME")
        """
        self.current_drowsiness_level = drowsiness_level
        
        if drowsiness_level == "EXTREME":
            self.play_extreme_alert()
        elif drowsiness_level == "NORMAL":
            self.play_normal_alert()
        else:
            self.stop_all_alerts()
            self.conversation_history = []  # Reset conversation history when driver is AWAKE
    
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
        audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        no_face_audio_path = os.path.join(audio_dir, "alert_no_face.wav")
        command = f'echo "{message}" | {self.piper_binary} --model {self.piper_model} --output_file {no_face_audio_path}'
        try:
            subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
            print(f"Generated no face alert audio: {no_face_audio_path}")
        except subprocess.SubprocessError as e:
            print(f"Error generating no face alert audio: {e}\nStderr: {e.stderr if hasattr(e, 'stderr') else 'N/A'}")
            return
        
        # Verify the output file exists
        if not os.path.isfile(no_face_audio_path):
            print(f"Error: No face alert audio file {no_face_audio_path} was not created")
            return
        
        try:
            no_face_sound = pygame.mixer.Sound(no_face_audio_path)
            no_face_sound.set_volume(self.volume)
        except pygame.error as e:
            print(f"Error loading no face alert audio with pygame: {e}")
            return
        
        self.recent_system_messages.append(message.lower())
        if len(self.recent_system_messages) > 5:
            self.recent_system_messages.pop(0)
        
        self.is_playing_audio = True
        self.last_system_audio_time = time.time()
        
        self.no_face_channel.play(no_face_sound)