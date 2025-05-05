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
        <div style={{ position: "absolute", bottom: "120px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
          <Lumi />
        </div>
        
        <div className="visualizer-container" style={{
          width: "300px", // Increased width
          maxWidth: "800px", 
          marginBottom: "160px", 
          position: "relative", 
          zIndex: 1,
          height: "120px" // Increased height
        }}>
          <AudioVisualizer isActive={true} />
        </div>
      </div>

      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default ListeningPage