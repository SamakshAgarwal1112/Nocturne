import { useState, useEffect } from "react";

const App = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [drowsinessStatus, setDrowsinessStatus] = useState("Device OFF");

  useEffect(() => {
    startDrowsiness();
  }, []);

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
    <div className="min-h-screen bg-[#1a202c] text-white flex flex-col items-center pt-8 gap-8">
      <h1 className="text-4xl font-bold mb-4">🛡️ Driver Safety Dashboard</h1>

      <button
        onClick={toggleCamera}
        className="px-6 py-3 text-xl rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
      >
        {cameraOn ? "Close Camera" : "Open Camera"}
      </button>

      {cameraOn && (
        <div className="mt-4 border-4 border-blue-500 rounded-lg overflow-hidden">
          <img src={cameraSrc} alt="Camera Feed" width="480" height="360" />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <button
          onClick={() => adjustVolume("down")}
          className="px-6 py-3 text-xl rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
        >
          🔉 Volume Down
        </button>
        <button
          onClick={() => adjustVolume("up")}
          className="px-6 py-3 text-xl rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
        >
          🔊 Volume Up
        </button>
        <button
          onClick={() => systemAction("shutdown")}
          className="px-6 py-3 text-xl rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-md transition"
        >
          🛑 Shutdown
        </button>
      </div>

      {/* Uncomment if needed
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <button onClick={startDrowsiness} className="px-6 py-3 text-xl rounded-2xl bg-green-600 hover:bg-green-500 text-white shadow-md transition">
          🧠 Start Drowsiness
        </button>
        <button onClick={stopDrowsiness} className="px-6 py-3 text-xl rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-md transition">
          ✋ Stop Drowsiness
        </button>
      </div> */}

      <p className="text-xl mt-4">
        Drowsiness Status:{" "}
        <span className="font-mono text-3xl text-green-400">{drowsinessStatus}</span>
      </p>
    </div>
  );
};

export default App;
