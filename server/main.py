from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse
import cv2
import subprocess

app = FastAPI()
cap = None

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

@app.post("/system/reboot")
def reboot():
    subprocess.run(["sudo", "reboot"])
    return {"status": "rebooting"}