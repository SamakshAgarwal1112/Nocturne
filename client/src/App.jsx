import { useState } from 'react';

const App = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);

    await fetch(`http://localhost:8000/camera/${newState ? "start" : "stop"}`);
    if (newState) {
      setCameraSrc("http://localhost:8000/video");
    } else {
      setCameraSrc("");
    }
  };

  const systemAction = async (action) => {
    await fetch(`http://localhost:8000/system/${action}`, { method: "POST" });
  };

  const adjustVolume = async (direction) => {
    await fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" });
  };

  return (
    <div style={{ textAlign: "center", paddingTop: "50px" }}>
      <button onClick={toggleCamera} style={buttonStyle}>
        {cameraOn ? "Close Camera" : "Open Camera"}
      </button>

      {cameraOn && (
        <div style={{ marginTop: "20px" }}>
          <img src={cameraSrc} alt="Camera Feed" width="320" height="240" />
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        <button onClick={() => adjustVolume("down")} style={buttonStyle}>🔉 Volume Down</button>
        <button onClick={() => adjustVolume("up")} style={buttonStyle}>🔊 Volume Up</button>
      </div>

      <div style={{ marginTop: "40px" }}>
      <button onClick={() => systemAction("shutdown")} style={buttonStyle}>🛑 Shutdown</button>
      <button onClick={() => systemAction("reboot")} style={buttonStyle}>🔁 Reboot</button>
    </div>
    </div>
  );
};

const buttonStyle = {
  padding: "20px",
  fontSize: "24px",
  margin: "12px",
  borderRadius: "16px",
  width: "240px",
  backgroundColor: "#1e1e2f",
  color: "#fefefe",
  border: "2px solid #3f3f5e",
  boxShadow: "0 0 10px #58a6ff",
  transition: "transform 0.1s ease-in-out",
  touchAction: "manipulation"
};

export default App;