"use client"

import { useEffect, useRef, useState } from "react"

function AudioVisualizer({ isActive }) {
  const [bars, setBars] = useState([])
  const intervalRef = useRef(null)

  useEffect(() => {
    // Initialize with random heights
    setBars(Array.from({ length: 30 }, () => Math.random() * 50 + 10))

    const updateBars = () => {
      setBars((prev) =>
        prev.map(() => Math.random() * 50 + 10)
      )
    }

    if (isActive) {
      updateBars() // Run once immediately
      intervalRef.current = setInterval(updateBars, 200) // update every 200ms
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
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
            transition: 'height 0.2s ease-in-out',
          }}
        />
      ))}
    </div>
  )
}

export default AudioVisualizer
