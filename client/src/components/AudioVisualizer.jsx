"use client"

import { useEffect, useRef, useState } from "react"

function AudioVisualizer({ isActive }) {
  const [bars, setBars] = useState([])
  const animationRef = useRef(null)

  useEffect(() => {
    // Initialize with random heights
    setBars(Array.from({ length: 30 }, () => Math.random() * 50 + 10))

    const updateBars = () => {
      if (isActive) {
        setBars((prev) =>
          prev.map(() => {
            // Create a wave-like pattern with some randomness
            return Math.random() * 50 + 10
          }),
        )
        animationRef.current = requestAnimationFrame(updateBars)
      }
    }

    if (isActive) {
      animationRef.current = requestAnimationFrame(updateBars)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  return (
    <div className="audio-visualizer">
      {bars.map((height, index) => (
        <div
          key={index}
          className="visualizer-bar"
          style={{
            height: `${height}%`,
            opacity: isActive ? 1 : 0.7,
          }}
        />
      ))}
    </div>
  )
}

export default AudioVisualizer
