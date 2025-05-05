import { useState, useEffect } from 'react';

function BatteryStatus() {
  const [batteryLevel, setBatteryLevel] = useState(50);
  
  // In a real app, you could use the Battery Status API or fetch from backend
  useEffect(() => {
    // Mock battery level change for demo purposes
    const interval = setInterval(() => {
      setBatteryLevel(prev => {
        const newLevel = prev - 1;
        return newLevel < 10 ? 50 : newLevel;
      });
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="battery-indicator">
      <div className="battery-dot" style={{
        backgroundColor: batteryLevel > 20 ? '#4ade80' : '#ef4444'
      }}></div>
      <span className="battery-text">{batteryLevel}%</span>
    </div>
  );
}

export default BatteryStatus;