import { FiX } from "react-icons/fi"
import AudioVisualizer from "../components/AudioVisualizer"
import Lumi from "../components/Lumi"
import BatteryStatus from "../components/BatteryStatus"
import ControlBar from "../components/ControlBar"

function ListeningWithLabelPage({ onExit }) {
  return (
    <div className="screen-container listening-screen">
      <div className="status-bar">
        <BatteryStatus />
        <button 
          onClick={onExit} 
          className="p-1.5 text-xs rounded bg-red-600 hover:bg-red-500 flex items-center gap-1"
        >
          <FiX className="text-xs" /> Stop
        </button>
      </div>

      <div className="content-area" style={{ flex: 1, position: "relative" }}>
        {/* Center Lumi in the background */}
        <div style={{ position: "absolute", top: "60px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
          <Lumi />
        </div>
        
        <h2 className="question-text" style={{ position: "relative", zIndex: 1 }}>Where are you going today? Do you feel tired?</h2>
        <div className="visualizer-container" style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <span className="listening-label">Listening</span>
          <AudioVisualizer isActive={true} />
        </div>
      </div>

      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default ListeningWithLabelPage