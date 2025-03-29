import speech_recognition as sr
from gtts import gTTS
import os

def recognize_speech():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        print("Listening...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio, language="en-IN")
        print(f"Driver Said: {text}")
        return text.lower()
    except sr.UnknownValueError:
        print("Could not understand the speech.")
    except sr.RequestError:
        print("Speech recognition service error.")

def speak_text(text):
    tts = gTTS(text=text, lang="en")
    tts.save("alert.mp3")
    os.system("mpg321 alert.mp3")

if __name__ == "__main__":
    print("Say 'q' or 'quit' to stop the conversation.")

    while True:
        driver_response = recognize_speech()

        if driver_response:
            if driver_response in ["q", "quit", "exit", "stop"]:
                print("Exiting conversation.")
                break

            response = "Please stay awake. Are you okay?" if "sleep" in driver_response or "tired" in driver_response else "Keep talking to stay active."
            speak_text(response)