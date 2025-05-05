"use client"

import { useState } from "react"
import { FiCamera, FiPower, FiVolume2, FiVolumeX } from "react-icons/fi"
import VoiceButton from "../components/VoiceButton"
import AudioVisualizer from "../components/AudioVisualizer"

function ListeningWithLabelPage() {
  const [isMuted, setIsMuted] = useState(false)

  return (
    <div className="screen-container listening-screen">
      <div className="status-bar">
        <div className="battery-indicator">
          <div className="battery-dot"></div>
          <span className="battery-text">50%</span>
        </div>
        <FiCamera className="camera-icon" />
      </div>

      <div className="content-area" style={{ flex: 1 }}>
        <h2 className="question-text">Where are you going today? Do you feel tired?</h2>
        <div className="visualizer-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <span className="listening-label">Listening</span>
          <AudioVisualizer isActive={true} />
        </div>
      </div>

      <div className="control-bar">
        <button className="control-button">
          <FiPower />
        </button>

        <VoiceButton color="blue" />

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

export default ListeningWithLabelPage