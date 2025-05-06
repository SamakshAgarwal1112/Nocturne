import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { FiPower, FiCamera } from "react-icons/fi";

// Page components
import SpeakingPage from "./pages/SpeakingPage.jsx";
import ListeningPage from "./pages/ListeningPage.jsx";
import AlertPage from "./pages/AlertPage.jsx";
import Lumi from "./components/Lumi.jsx";
import BatteryStatus from "./components/BatteryStatus.jsx";
import ControlBar from "./components/ControlBar.jsx";
import "./App.css";

// API service for backend communication
const apiService = {
  startDrowsiness: () =>
    fetch("http://localhost:8000/drowsiness/start", { method: "POST" }),
  stopDrowsiness: () =>
    fetch("http://localhost:8000/drowsiness/stop", { method: "POST" }),
  toggleCamera: (isOn) =>
    fetch(`http://localhost:8000/camera/${isOn ? "start" : "stop"}`),
  systemAction: (action) =>
    fetch(`http://localhost:8000/system/${action}`, { method: "POST" }),
  adjustVolume: (direction) =>
    fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" }),
  userSpeaking: () =>
    fetch("http://localhost:8000/user/speaking", { method: "POST" }),
};

function useDrowsinessMonitor(isDriveStarted) {
  const [drowsinessStatus, setDrowsinessStatus] = useState("AWAKE");
  const [geminiResponse, setGeminiResponse] = useState("");

  // Start drowsiness detection when drive is started
  useEffect(() => {
    if (isDriveStarted) {
      apiService.startDrowsiness().catch(err => 
        console.error("Failed to start drowsiness detection:", err)
      );
    }
  }, [isDriveStarted]);

  // Listen for drowsiness status updates with EventSource
  useEffect(() => {
    if (!isDriveStarted) return;

    const eventSource = new EventSource(
      "http://localhost:8000/drowsiness/live_status"
    );
    const chatSource = new EventSource(
      "http://localhost:8000/gemini_response"
    );

    eventSource.onmessage = (event) => {
      setDrowsinessStatus(event.data);
    };
    
    chatSource.onmessage = (event) => {
      setGeminiResponse(event.data);
    };

    return () => {
      eventSource.close();
      chatSource.close();
    };
  }, [isDriveStarted]);

  return { status: drowsinessStatus, text: geminiResponse };
}

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

const StartScreen = ({ onStart }) => (
  <div className="screen-container default-screen h-full flex flex-col items-center justify-center">
    <h1 className="text-6xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text mb-12">
      Driver Safety System
    </h1>
    <div className="h-12"></div>
    <button
      onClick={onStart}
      className="px-12 py-4 text-xl rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
    >
      <FiPower className="text-xl" /> Start Drive
    </button>
  </div>
);

const AwakeStatus = () => (
  <div className="screen-container default-screen flex flex-col items-center justify-center h-full relative">
    <div
      className="absolute inset-0"
      style={{
        background: "radial-gradient(circle at center, #263c5a 0%, #1a202c 70%)",
        zIndex: -1,
      }}
    ></div>
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 0,
      }}
    >
      <Lumi />
    </div>
  </div>
);

const MainApp = () => {
  const [isDriveStarted, setIsDriveStarted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const navigate = useNavigate();
  
  // Use custom hook for drowsiness monitoring
  const drowsinessStatus = useDrowsinessMonitor(isDriveStarted);

  const handleUserSpeaking = async () => {
    try {
      await apiService.userSpeaking();
    } catch (error) {
      console.error("Failed to send user speaking signal:", error);
    }
  };

  const exitDrive = () => {
    apiService.stopDrowsiness().catch(err => 
      console.error("Failed to stop drowsiness detection:", err)
    );
    setIsDriveStarted(false);
  };

  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);
    await apiService.toggleCamera(newState);
    setCameraSrc(newState ? "http://localhost:8000/video" : "");
  };

  /**
   * Render content based on current state
   */
  const renderContent = () => {
    // Initial state - Start Drive button
    if (!isDriveStarted) {
      return <StartScreen onStart={() => setIsDriveStarted(true)} />;
    }

    // Render different screens based on drowsiness status
    switch (drowsinessStatus.status) {
      case "AWAKE":
        return <AwakeStatus />;
      case "LISTENING":
        return <ListeningPage onExit={exitDrive} />;
      case "SYSTEM":
        return <SpeakingPage text={drowsinessStatus.text} onExit={exitDrive} />;
      case "NORMAL":
      case "EXTREME":
        return (
          <div
            onClick={handleUserSpeaking}
            className="h-full w-full"
            style={{ cursor: "pointer" }}
          >
            <AlertPage onExit={exitDrive} />
          </div>
        );
      default:
        return <AwakeStatus />;
    }
  };

  return (
    <div className="h-screen w-screen max-w-[800px] max-h-[480px] mx-auto bg-[#1a202c] text-white flex flex-col overflow-hidden">
      {/* Top status bar */}
      <div className="flex justify-center items-center p-2 bg-[#0d1424] shadow-md h-[64px] z-10 relative">
        {/* <BatteryStatus /> */}
        {/* <div className="w-174">

        </div> */}
        {isDriveStarted && (
          <button
            onClick={exitDrive}
            className="w-16 px-6 py-3 text-lg rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            Stop
          </button>
        )}
        {!isDriveStarted && (
          <button
            onClick={exitDrive}
            className="w-10 px-6 py- text-lg rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <FiCamera/>
          </button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center h-[390px] relative z-0">
        {renderContent()}
      </div>

      {/* Bottom control bar */}
      {isDriveStarted && (
        <div className="z-10 relative">
          <ControlBar onUserSpeaking={handleUserSpeaking} />
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
      </Routes>
    </Router>
  );
};

export default App;