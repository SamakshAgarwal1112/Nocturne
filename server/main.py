from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse
import cv2
import os
import subprocess
import time
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
cap = None
detection_process = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/drowsiness/start")
def start_drowsiness():
    global detection_process
    if detection_process is None:
        script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'prediction/src/main.py'))
        python_path = subprocess.check_output(['pyenv', 'prefix', 'edp']).decode('utf-8').strip()
        python_path = os.path.join(python_path, 'bin', 'python')
        detection_process = subprocess.Popen([python_path, script_path, "--config", os.path.join(os.path.dirname(script_path), '..', 'config/config.yaml')])

    return {"status": "started"}

@app.post("/drowsiness/stop")
def stop_drowsiness():
    global detection_process
    if detection_process:
        detection_process.terminate()
        detection_process = None
    return {"status": "stopped"}

@app.get("/drowsiness/live_status")
def live_status():
    def event_stream():
        last_status = "AWAKE"
        while True:
            try:
                with open("/tmp/drowsiness_status.txt", "r") as f:
                    current_status = f.read().strip()
                if current_status != last_status:
                    last_status = current_status
                    yield f"data: {current_status}\n\n"
            except:
                yield "data: unknown\n\n"
            time.sleep(1)
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/camera/start")
def start_camera():
    global cap
    cap = cv2.VideoCapture(0)
    return {"status": "camera started"}

@app.get("/camera/stop")
def stop_camera():
    global cap
    if cap:
        cap.release()
        cap = None
    return {"status": "camera stopped"}

def gen_frames():
    global cap
    while cap and cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
        _, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/video")
def video_feed():
    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/volume/{direction}")
def volume_control(direction: str):
    if direction == "up":
        subprocess.run(["amixer", "set", "Master", "5%+"])
    elif direction == "down":
        subprocess.run(["amixer", "set", "Master", "5%-"])
    return {"volume": direction}

@app.post("/system/shutdown")
def shutdown():
    subprocess.run(["sudo", "shutdown", "now"])
    return {"status": "shutting down"}