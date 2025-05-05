import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { FiCamera, FiPower, FiVolume2, FiVolumeX, FiMonitor } from "react-icons/fi";
import SpeakingPage from "./pages/SpeakingPage.jsx";
import ListeningPage from "./pages/ListeningPage.jsx";
import AlertPage from "./pages/AlertPage.jsx";
import ListeningWithLabelPage from "./pages/ListeningWithLabelPage.jsx";
import "./App.css";

const MainApp = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [drowsinessStatus, setDrowsinessStatus] = useState("INITIAL"); // Initial state before starting
  const [isListening, setIsListening] = useState(false);
  const [isDriveStarted, setIsDriveStarted] = useState(false);
  const navigate = useNavigate();

  // Start drowsiness detection when drive is started
  useEffect(() => {
    if (isDriveStarted) {
      const startDrowsiness = async () => {
        await fetch("http://localhost:8000/drowsiness/start", { method: "POST" });
        setDrowsinessStatus("NORMAL"); // Set initial status to AWAKE after starting
      };
      startDrowsiness();
    }
  }, [isDriveStarted]);

  // Listen for drowsiness status updates
  useEffect(() => {
    if (!isDriveStarted) return;

    const eventSource = new EventSource("http://localhost:8000/drowsiness/live_status");

    eventSource.onmessage = (event) => {
      const status = event.data;
      setDrowsinessStatus(status);
      
      // If status changes to NORMAL or EXTREME, we're not listening yet
      if (status === "NORMAL" || status === "EXTREME") {
        setIsListening(false);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isDriveStarted]);

  // Simulate user starting to speak (in a real app, this would be triggered by actual audio detection)
  const handleUserSpeaking = () => {
    if (drowsinessStatus === "NORMAL" || drowsinessStatus === "EXTREME") {
      setIsListening(true);
    }
  };

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);
    await fetch(`http://localhost:8000/camera/${newState ? "start" : "stop"}`);
    setCameraSrc(newState ? "http://localhost:8000/video" : "");
  };
  // use this to connect to backend
  const systemAction = async (action) => {
    await fetch("http://localhost:8000/drowsiness/stop", { method: "POST" });
    await fetch(`http://localhost:8000/system/${action}`, { method: "POST" });
  };

  const adjustVolume = async (direction) => {
    await fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" });
  };

  const startDrive = () => {
    setIsDriveStarted(true);
  };

  const renderContent = () => {
    // Initial state - Start Drive button
    if (!isDriveStarted) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-3xl font-bold mb-6">Nocturne Driver Safety</h1>
          <button 
            onClick={startDrive}
            className="px-6 py-3 text-xl rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition flex items-center gap-2"
          >
            <FiPower className="text-lg" /> Start Drive
          </button>
        </div>
      );
    }
    
    // AWAKE state - Show logo
    if (drowsinessStatus === "AWAKE") {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          {/* Neon blue circle logo placeholder - smaller for 800x480 */}
          <div className="w-32 h-32 rounded-full bg-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.8)] flex items-center justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] flex items-center justify-center text-xl font-bold text-white">
              Nocturne
            </div>
          </div>
          <p className="text-lg">Driver Status: <span className="text-green-400 font-bold">AWAKE</span></p>
        </div>
      );
    }
    
    // NORMAL or EXTREME state with no listening - Show Alert UI
    if ((drowsinessStatus === "NORMAL" || drowsinessStatus === "EXTREME") && !isListening) {
      return (
        <div onClick={handleUserSpeaking} className="h-full w-full cursor-pointer">
          <AlertPage />
        </div>
      );
    }
    
    // NORMAL or EXTREME state with listening - Show Listening UI
    if ((drowsinessStatus === "NORMAL" || drowsinessStatus === "EXTREME") && isListening) {
      return <ListeningPage />;
    }
    
    return <div>Unknown state</div>;
  };

  return (
    <div className="h-screen w-screen max-w-[800px] max-h-[480px] mx-auto bg-[#1a202c] text-white flex flex-col overflow-hidden">
      {/* Top status bar - always visible */}
      <div className="flex justify-between items-center p-2 bg-[#0d1424] shadow-md h-[40px]">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            drowsinessStatus === "AWAKE" ? "bg-green-400" : 
            drowsinessStatus === "NORMAL" ? "bg-yellow-400" : 
            drowsinessStatus === "EXTREME" ? "bg-red-400" : "bg-gray-400"
          }`}></div>
          <span className="text-xs">{drowsinessStatus}</span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={toggleCamera} 
            className="p-1.5 text-xs rounded bg-blue-700 hover:bg-blue-600 flex items-center gap-1"
          >
            <FiCamera className="text-xs" /> {cameraOn ? "Off" : "On"}
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 flex items-center gap-1"
          >
            <FiMonitor className="text-xs" /> Dashboard
          </button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center h-[390px]">
        {renderContent()}
      </div>
      
      {/* Bottom control bar - always visible if drive started */}
      {isDriveStarted && (
        <div className="flex justify-between items-center p-2 bg-[#0d1424] h-[50px]">
          <button
            onClick={() => adjustVolume("down")}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
          >
            <FiVolumeX className="text-base" />
          </button>
          
          <div className="flex-1 flex justify-center">
            <button
              onClick={handleUserSpeaking}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center"
            >
              <FiPower className="text-lg" />
            </button>
          </div>
          
          <button
            onClick={() => adjustVolume("up")}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
          >
            <FiVolume2 className="text-base" />
          </button>
        </div>
      )}
      
      {/* Camera feed overlay if camera is on - smaller and repositioned for 800x480 */}
      {cameraOn && cameraSrc && (
        <div className="absolute top-12 right-2 border-2 border-blue-500 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-800 px-2 py-0.5 text-xs flex items-center gap-1">
            <FiCamera className="text-xs" /> Live Camera
          </div>
          <img src={cameraSrc} alt="Camera Feed" width="160" height="120" />
        </div>
      )}
    </div>
  );
};

// App component with routing
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
};

// Dashboard component (with icon updates) - optimized for 800x480
const Dashboard = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [drowsinessStatus, setDrowsinessStatus] = useState("Device OFF");
  const navigate = useNavigate();

  useEffect(() => {
    const startDrowsiness = async () => {
      await fetch("http://localhost:8000/drowsiness/start", { method: "POST" });
    };
    startDrowsiness();
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/drowsiness/live_status");

    eventSource.onmessage = (event) => {
      const status = event.data;
      setDrowsinessStatus(status);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);
    await fetch(`http://localhost:8000/camera/${newState ? "start" : "stop"}`);
    setCameraSrc(newState ? "http://localhost:8000/video" : "");
  };

  const systemAction = async (action) => {
    await fetch("http://localhost:8000/drowsiness/stop", { method: "POST" });
    await fetch(`http://localhost:8000/system/${action}`, { method: "POST" });
  };

  const adjustVolume = async (direction) => {
    await fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" });
  };

  return (
    <div className="h-screen w-screen max-w-[800px] max-h-[480px] mx-auto bg-[#1a202c] text-white flex flex-col overflow-y-auto p-3 gap-3">
      <h1 className="text-2xl font-bold">🛡️ Driver Safety Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/")}
          className="py-2 text-md rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiMonitor /> Back to Main App
        </button>

        <button
          onClick={toggleCamera}
          className="py-2 text-md rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiCamera /> {cameraOn ? "Close Camera" : "Open Camera"}
        </button>
      </div>

      {cameraOn && (
        <div className="border-2 border-blue-500 rounded-lg overflow-hidden">
          <div className="bg-blue-800 px-2 py-1 text-xs flex items-center gap-1">
            <FiCamera /> Live Camera Feed
          </div>
          <img src={cameraSrc} alt="Camera Feed" width="100%" height="auto" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-2">
        <button
          onClick={() => adjustVolume("down")}
          className="py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiVolumeX /> Volume Down
        </button>
        <button
          onClick={() => adjustVolume("up")}
          className="py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiVolume2 /> Volume Up
        </button>
        <button
          onClick={() => systemAction("shutdown")}
          className="py-2 text-sm rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiPower /> Shutdown
        </button>
      </div>

      <div className="p-2 bg-[#0d1424] rounded-lg mt-2">
        <p className="text-center">
          Drowsiness Status:{" "}
          <span className="font-mono text-xl text-green-400">{drowsinessStatus}</span>
        </p>
      </div>
    </div>
  );
};

export default App;