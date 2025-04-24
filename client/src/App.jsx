import { useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [drowsinessStatus, setDrowsinessStatus] = useState("Device OFF");

  useEffect(()=> {
    startDrowsiness();
  },[])

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);
    await fetch(`http://localhost:8000/camera/${newState ? "start" : "stop"}`);
    setCameraSrc(newState ? "http://localhost:8000/video" : "");
  };

  const systemAction = async (action) => {
    stopDrowsiness();
    await fetch(`http://localhost:8000/system/${action}`, { method: "POST" });
  };

  const adjustVolume = async (direction) => {
    await fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" });
  };

  const startDrowsiness = async () => {
    await fetch("http://localhost:8000/drowsiness/start", { method: "POST" });
  };

  const stopDrowsiness = async () => {
    await fetch("http://localhost:8000/drowsiness/stop", { method: "POST" });
  };

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/drowsiness/live_status");
  
    eventSource.onmessage = (event) => {
      setDrowsinessStatus(event.data);
    };
  
    return () => eventSource.close();
  }, []);

  return (
    <div className="app-container">
      <h1 className="title">🛡️ Driver Safety Dashboard</h1>

      <button onClick={toggleCamera} className="btn">
        {cameraOn ? "Close Camera" : "Open Camera"}
      </button>

      {cameraOn && (
        <div className="camera-container">
          <img src={cameraSrc} alt="Camera Feed" width="480" height="360" />
        </div>
      )}

      <div className="action-container">
        <button onClick={() => adjustVolume("down")} className="btn">🔉 Volume Down</button>
        <button onClick={() => adjustVolume("up")} className="btn">🔊 Volume Up</button>
        <button onClick={() => systemAction("shutdown")} className="btn shutdown">🛑 Shutdown</button>
      </div>

      {/* <div className="action-container">
        <button onClick={startDrowsiness} className="btn start-drowsiness">🧠 Start Drowsiness</button>
        <button onClick={stopDrowsiness} className="btn stop-drowsiness">✋ Stop Drowsiness</button>
        <button onClick={checkStatus} className="btn">🔍 Check Status</button>
      </div> */}

      <p className="status-text">Drowsiness Status: <span className="status-value">{drowsinessStatus}</span></p>
    </div>
  );
};

export default App;
