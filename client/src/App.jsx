import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import SpeakingPage from "./pages/SpeakingPage.jsx";
import ListeningPage from "./pages/ListeningPage.jsx";
import AlertPage from "./pages/AlertPage.jsx";
import ListeningWithLabelPage from "./pages/ListeningWithLabelPage.jsx";
import "./App.css";

const Dashboard = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSrc, setCameraSrc] = useState("");
  const [drowsinessStatus, setDrowsinessStatus] = useState("Device OFF");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("started")
    const startDrowsiness = async () => {
      await fetch("http://localhost:8000/drowsiness/start", { method: "POST" });
    };
    startDrowsiness();
    console.log("ended")
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/drowsiness/live_status");

    eventSource.onmessage = (event) => {
      const status = event.data;
      setDrowsinessStatus(status);

      // Navigate to corresponding pages based on status
      if (status === "EXTREME") {
        navigate("/alert");
      } else if (status === "NORMAL") {
        navigate("/listening");
      } else if (status === "AWAKE") {
        navigate("/");
      }
    };

    return () => {
      eventSource.close();
    };
  }, [navigate]);

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

      <p className="text-xl mt-4">
        Drowsiness Status:{" "}
        <span className="font-mono text-3xl text-green-400">{drowsinessStatus}</span>
      </p>
    </div>
  );
};

// PageWrapper component to manage routing and optional nav
const PageWrapper = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <>
      <Routes>
        <Route path="/" element={<SpeakingPage />} />
        <Route path="/listening" element={<ListeningPage />} />
        <Route path="/alert" element={<AlertPage />} />
        <Route path="/listening-with-label" element={<ListeningWithLabelPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

      {isDashboard && (
        <nav className="navigation flex gap-4 justify-center mt-4">
          <Link to="/" className="nav-link text-blue-300 hover:underline">Speaking</Link>
          <Link to="/listening" className="nav-link text-blue-300 hover:underline">Listening</Link>
          <Link to="/alert" className="nav-link text-blue-300 hover:underline">Alert</Link>
          <Link to="/listening-with-label" className="nav-link text-blue-300 hover:underline">Listening with Label</Link>
        </nav>
      )}
    </>
  );
};

// Main App component
const App = () => {
  return (
    <Router>
      <PageWrapper />
    </Router>
  );
};

export default App;
