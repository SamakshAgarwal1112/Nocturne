"use client"

import AudioVisualizer from "../components/AudioVisualizer"
import Lumi from "../components/Lumi"
import BatteryStatus from "../components/BatteryStatus"
import ControlBar from "../components/ControlBar"

function ListeningPage() {
  return (
    <div className="screen-container listening-screen">
      <div className="content-area" style={{ flex: 1, position: "relative" }}>
        {/* Center Lumi in the background */}
        <div style={{ position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
          <Lumi />
        </div>
        
        <h2 className="question-text" style={{ position: "relative", zIndex: 1 }}>Where are you going today? Do you feel tired?</h2>
        <div className="visualizer-container" style={{ maxWidth: "800px", marginBottom: "120px", position: "relative", zIndex: 1 }}>
          <AudioVisualizer isActive={true} />
        </div>
      </div>

      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default ListeningPage