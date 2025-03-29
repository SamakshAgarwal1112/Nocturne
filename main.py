import cv2
import numpy as np
import os
from ultralytics import YOLO
import speech_recognition as sr
from gtts import gTTS

model = YOLO("yolov8n.pt")

# recognizer = sr.Recognizer()
# mic = sr.Microphone()

def recognize_speech():
    with mic as source:
        print("Listening...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        return recognizer.recognize_google(audio, language="en-IN")
    except:
        return None

def speak_text(text):
    tts = gTTS(text=text, lang="en")
    tts.save("alert.mp3")
    os.system("mpg321 alert.mp3")

cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = int(box.cls[0].item())

            # if cls == 0:
            #     speak_text("Driver, you seem drowsy! Are you okay?")
            #     response = recognize_speech()

            #     if response and "yes" not in response.lower():
            #         speak_text("Please take a break.")

    cv2.imshow("Nocturne - Drowsiness Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
