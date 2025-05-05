"use client"

import { useState, useEffect } from "react"
import { FiMic, FiPause } from "react-icons/fi"

function VoiceButton({ color }) {
  const [isActive, setIsActive] = useState(true)
  const [pulseSize, setPulseSize] = useState(100)

  // Map color prop to actual color values
  const getColors = () => {
    switch (color) {
      case "purple":
        return {
          glow: "rgba(147, 51, 234, 0.5)",
          buttonClass: "voice-button-purple",
        }
      case "orange":
        return {
          glow: "rgba(249, 115, 22, 0.5)",
          buttonClass: "voice-button-orange",
        }
      case "blue":
        return {
          glow: "rgba(59, 130, 246, 0.5)",
          buttonClass: "voice-button-blue",
        }
      default:
        return {
          glow: "rgba(147, 51, 234, 0.5)",
          buttonClass: "voice-button-purple",
        }
    }
  }

  const colors = getColors()

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseSize((prev) => (prev === 100 ? 120 : 100))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="voice-button-container">
      {/* Outer glow */}
      <div
        className="voice-button-glow"
        style={{
          width: `${pulseSize}%`,
          height: `${pulseSize}%`,
          backgroundColor: colors.glow,
        }}
      />

      {/* Button */}
      <button className={`voice-button ${colors.buttonClass}`} onClick={() => setIsActive((prev) => !prev)}>
        {isActive ? <FiMic /> : <FiPause />}
      </button>
    </div>
  )
}

export default VoiceButton
