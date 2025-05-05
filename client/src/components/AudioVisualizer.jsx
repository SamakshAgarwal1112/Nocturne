"use client"

import { useEffect, useRef, useState } from "react"

function AudioVisualizer({ isActive }) {
  const [bars, setBars] = useState([])
  const intervalRef = useRef(null)

  useEffect(() => {
    // Initialize with random heights - increased number of bars for wider visualizer
    setBars(Array.from({ length: 40 }, () => Math.random() * 50 + 10))

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
            width: '4px', // Increased bar width
            marginLeft: '1px', // Added spacing between bars
            marginRight: '1px', // Added spacing between bars
          }}
        />
      ))}
    </div>
  )
}

export default AudioVisualizer