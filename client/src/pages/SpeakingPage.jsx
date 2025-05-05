"use client"

import { useState } from "react"
import { FiCamera, FiPower, FiVolume2, FiVolumeX } from "react-icons/fi"
import VoiceButton from "../components/VoiceButton"

function SpeakingPage() {
  const [isMuted, setIsMuted] = useState(false)

  return (
    <div className="screen-container speaking-screen">
      <div className="status-bar">
        <div className="battery-indicator">
          <div className="battery-dot"></div>
          <span className="battery-text">50%</span>
        </div>
        <FiCamera className="camera-icon" />
      </div>

      <div className="content-area" style={{ flex: 1 }}>
        <h2 className="question-text">Where are you going today?</h2>
        <h2 className="question-text">Do you feel tired?</h2>
      </div>

      <div className="control-bar">
        <button className="control-button">
          <FiPower />
        </button>

        <VoiceButton color="purple" />

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

export default SpeakingPage