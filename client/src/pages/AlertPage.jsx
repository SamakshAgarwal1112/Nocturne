"use client"

import { useState } from "react"
import { FiCamera, FiPower, FiVolume2, FiVolumeX, FiAlertTriangle } from "react-icons/fi"
import VoiceButton from "../components/VoiceButton"

function AlertPage() {
  const [isMuted, setIsMuted] = useState(false)

  return (
    <div className="screen-container alert-screen">
      <div className="status-bar">
        <div className="battery-indicator">
          <div className="battery-dot"></div>
          <span className="battery-text">50%</span>
        </div>
        <FiCamera className="camera-icon" />
      </div>
      <div className="content-area" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <FiAlertTriangle className="alert-icon" style={{ fontSize: "120px" }} />
        <h2 className="alert-text" style={{ fontSize: "48px" }}>Wake Up!</h2>
      </div>

      <div className="control-bar">
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