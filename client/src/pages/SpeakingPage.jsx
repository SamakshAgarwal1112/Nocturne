import { FiX } from "react-icons/fi"
import VoiceButton from "../components/VoiceButton"
import Lumi from "../components/Lumi"
import BatteryStatus from "../components/BatteryStatus"
import ControlBar from "../components/ControlBar"

function SpeakingPage({text, onExit}) {
  return (
    <div className="screen-container speaking-screen">
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
        
        <h2 className="question-text" style={{ position: "relative", zIndex: 1 }}>{`${text}`}</h2>
      </div>

      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default SpeakingPage