import { useState } from 'react';
import { FiPower, FiVolume2, FiVolume } from "react-icons/fi";

function ControlBar({ onUserSpeaking }) {
  const [volume, setVolume] = useState(50);
  
  const adjustVolume = async (direction) => {
    // Call API to adjust actual system volume
    try {
      await fetch(`http://localhost:8000/volume/${direction}`, { method: "POST" });
      
      // Update UI volume
      setVolume(prev => {
        if (direction === "up" && prev < 100) return prev + 10;
        if (direction === "down" && prev > 0) return prev - 10;
        return prev;
      });
    } catch (error) {
      console.error("Failed to adjust volume:", error);
    }
  };

  return (
    <div className="control-bar">
      <button 
        className="control-button power-button"
        onClick={onUserSpeaking}
      >
        <FiPower className="text-lg" />
      </button>
      
      <div className="volume-controls">
        <div className="volume-slider-container">
          <button 
            className="volume-adjust-btn" 
            onClick={() => adjustVolume("down")}
          >
            <FiVolume className="text-sm" />
          </button>
          
          <div className="volume-slider">
            <div 
              className="volume-level" 
              style={{ width: `${volume}%` }}
            ></div>
          </div>
          
          <button 
            className="volume-adjust-btn" 
            onClick={() => adjustVolume("up")}
          >
            <FiVolume2 className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ControlBar;