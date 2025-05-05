"use client"

import { useState } from "react"
import { FiCamera, FiPower, FiVolume2, FiVolumeX, FiAlertTriangle } from "react-icons/fi"
import VoiceButton from "../components/VoiceButton"
import Lumi from "../components/Lumi"

function AlertPage() {
  const [isMuted, setIsMuted] = useState(false)

  return (
    <div className="screen-container alert-screen" style={{ width: "800px", height: "480px", maxWidth: "100vw", maxHeight: "100vh" }}>
      {/* Compact status bar for 800x480 */}
      <div className="status-bar" style={{ padding: "4px 8px", height: "30px" }}>
        <div className="battery-indicator">
          <div className="battery-dot"></div>
          <span className="battery-text">50%</span>
        </div>
        <FiCamera className="camera-icon" />
      </div>
      
      {/* Content area with optimized sizing */}
      <div className="content-area" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", height: "400px", position: "relative" }}>
        {/* Center Lumi in the background */}
        {/* Place Lumi at top center */}
      <div style={{ position: "absolute", top: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
        <Lumi />
      </div>
        
        {/* Optimize alert icon size for 800x480 */}
        <FiAlertTriangle className="alert-icon" style={{ fontSize: "100px", position: "relative", zIndex: 1, marginBottom: "10px" }} />
        
        {/* Optimize text size for 800x480 */}
        <h2 className="alert-text" style={{ fontSize: "42px", position: "relative", zIndex: 1, margin: 0 }}>Wake Up!</h2>
        <p style={{ fontSize: "18px", opacity: 0.8, textAlign: "center", marginTop: "10px", position: "relative", zIndex: 1 }}>
          Tap anywhere or speak to respond
        </p>
      </div>

      {/* Compact control bar for 800x480 */}
      <div className="control-bar" style={{ padding: "8px", height: "50px" }}>
        <button className="control-button">
          <FiPower />
        </button>

        <VoiceButton color="orange" />

        <div className="volume-controls">
          <button className="control-button" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <FiVolumeX /> : <FiVolume2 />}
          </button>
          <button className="control-button">
            <FiVolume2 />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertPage