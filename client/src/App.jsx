import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { FiCamera, FiPower, FiVolume2, FiVolumeX, FiMonitor } from "react-icons/fi";

// Page components
import SpeakingPage from "./pages/SpeakingPage.jsx";
import ListeningPage from "./pages/ListeningPage.jsx";
import AlertPage from "./pages/AlertPage.jsx";
import ListeningWithLabelPage from "./pages/ListeningWithLabelPage.jsx";
import Lumi from "./components/Lumi.jsx";
import "./App.css";

// API service for backend communication
const apiService = {
  startDrowsiness: () => fetch("http://localhost:8000/drowsiness/start", { method: "POST" }),
  stopDrowsiness: () => fetch("http://localhost:8000/drowsiness/stop", { method: "POST" }),
  toggleCamera: (isOn) => fetch(`http://localhost:8000/camera/${isOn ? "start" : "stop"}`),
  systemAction: (action) => fetch(`http://localhost:8000/system/${action}`, { method: "POST" }),
  adjustVolume: (direction) => fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" })
};

// Custom hook for drowsiness monitoring
function useDrowsinessMonitor(isDriveStarted) {
  const [drowsinessStatus, setDrowsinessStatus] = useState("INITIAL");

  // Start drowsiness detection when drive is started
  useEffect(() => {
    if (isDriveStarted) {
      const startDrowsiness = async () => {
        await apiService.startDrowsiness();
        setDrowsinessStatus("NORMAL");
      };
      startDrowsiness();
    }
  }, [isDriveStarted]);

  // Listen for drowsiness status updates
  useEffect(() => {
    if (!isDriveStarted) return;

    const eventSource = new EventSource("http://localhost:8000/drowsiness/live_status");

    eventSource.onmessage = (event) => {
      setDrowsinessStatus(event.data);
    };

    return () => {
      eventSource.close();
    };
  }, [isDriveStarted]);

  return drowsinessStatus;
}

// Status indicator component
const StatusIndicator = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "AWAKE": return "bg-green-400";
      case "NORMAL": return "bg-yellow-400";
      case "EXTREME": return "bg-red-400";
      case "LISTENING": return "bg-blue-400";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
      <span className="text-xs">{status}</span>
    </div>
  );
};

// Camera overlay component
const CameraOverlay = ({ src }) => (
  <div className="absolute top-12 right-2 border-2 border-blue-500 rounded-lg shadow-lg overflow-hidden">
    <div className="bg-blue-800 px-2 py-0.5 text-xs flex items-center gap-1">
      <FiCamera className="text-xs" /> Live Camera
    </div>
    <img src={src} alt="Camera Feed" width="160" height="120" />
  </div>
);

// Start screen component
const StartScreen = ({ onStart }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <h1 className="text-3xl font-bold mb-6">Nocturne Driver Safety</h1>
    <button 
      onClick={onStart}
      className="px-6 py-3 text-xl rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition flex items-center gap-2"
    >
      <FiPower className="text-lg" /> Start Drive
    </button>
  </div>
);

// Awake status component
const AwakeStatus = () => (
  <div className="flex flex-col items-center justify-center h-full relative">
    {/* Center Lumi in the background */}
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0 }}>
      <Lumi />
    </div>
    
    {/* Neon blue circle logo placeholder */}
    <div className="w-32 h-32 rounded-full bg-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.8)] flex items-center justify-center mb-4 relative z-10">
      <div className="w-24 h-24 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] flex items-center justify-center text-xl font-bold text-white">
        Nocturne
      </div>
    </div>
    <p className="text-lg relative z-10">Driver Status: <span className="text-green-400 font-bold">AWAKE</span></p>
  </div>
);

// Bottom controls component
const ControlBar = ({ onUserSpeaking, onAdjustVolume }) => (
  <div className="flex justify-between items-center p-2 bg-[#0d1424] h-[50px]">
    <button
      onClick={() => onAdjustVolume("down")}
      className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
    >
      <FiVolumeX className="text-base" />
    </button>
    
    <div className="flex-1 flex justify-center">
      <button
        onClick={onUserSpeaking}
        className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center"
      >
        <FiPower className="text-lg" />
      </button>
    </div>
    
    <button
      onClick={() => onAdjustVolume("up")}
      className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
    >
      <FiVolume2 className="text-base" />
    </button>
  </div>
);

// Main application component
const MainApp = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [isDriveStarted, setIsDriveStarted] = useState(false);
  const navigate = useNavigate();
  
  // Use custom hook for drowsiness monitoring
  const drowsinessStatus = useDrowsinessMonitor(isDriveStarted);

  const handleUserSpeaking = async () => {
    // Signal to backend that user is attempting to respond
    // This could trigger a status change to LISTENING from the backend
    await fetch("http://localhost:8000/user/speaking", { method: "POST" });
  };

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);
    await apiService.toggleCamera(newState);
    setCameraSrc(newState ? "http://localhost:8000/video" : "");
  };

  const adjustVolume = async (direction) => {
    await apiService.adjustVolume(direction);
  };

  const renderContent = () => {
    // Initial state - Start Drive button
    if (!isDriveStarted) {
      return <StartScreen onStart={() => setIsDriveStarted(true)} />;
    }
    
    // AWAKE state - Show logo
    if (drowsinessStatus === "AWAKE") {
      return <AwakeStatus />;
    }
    
    // LISTENING state - Show Listening UI
    if (drowsinessStatus === "LISTENING") {
      return <ListeningPage />;
    }
    
    // NORMAL or EXTREME state - Show Alert UI with ability to trigger speak action
    if (drowsinessStatus === "NORMAL" || drowsinessStatus === "EXTREME") {
      return (
        <div onClick={handleUserSpeaking} className="h-full w-full" style={{ cursor: 'pointer' }}>
          <AlertPage />
        </div>
      );
    }
    
    return <div>Unknown state: {drowsinessStatus}</div>;
  };

  return (
    <div className="h-screen w-screen max-w-[800px] max-h-[480px] mx-auto bg-[#1a202c] text-white flex flex-col overflow-hidden">
      {/* Top status bar - always visible */}
      <div className="flex justify-between items-center p-2 bg-[#0d1424] shadow-md h-[40px]">
        <StatusIndicator status={drowsinessStatus} />
        
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
        <ControlBar 
          onUserSpeaking={handleUserSpeaking}
          onAdjustVolume={adjustVolume}
        />
      )}
      
      {/* Camera feed overlay if camera is on */}
      {cameraOn && cameraSrc && <CameraOverlay src={cameraSrc} />}
    </div>
  );
};

// Dashboard component
const Dashboard = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [drowsinessStatus, setDrowsinessStatus] = useState("Device OFF");
  const navigate = useNavigate();

  // Start drowsiness detection on component mount
  useEffect(() => {
    apiService.startDrowsiness();
  }, []);

  // Listen for drowsiness status updates
  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/drowsiness/live_status");

    eventSource.onmessage = (event) => {
      setDrowsinessStatus(event.data);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);
    await apiService.toggleCamera(newState);
    setCameraSrc(newState ? "http://localhost:8000/video" : "");
  };

  const handleSystemAction = async (action) => {
    await apiService.stopDrowsiness();
    await apiService.systemAction(action);
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
          onClick={() => apiService.adjustVolume("down")}
          className="py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiVolumeX /> Volume Down
        </button>
        <button
          onClick={() => apiService.adjustVolume("up")}
          className="py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center justify-center gap-1"
        >
          <FiVolume2 /> Volume Up
        </button>
        <button
          onClick={() => handleSystemAction("shutdown")}
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

export default App;