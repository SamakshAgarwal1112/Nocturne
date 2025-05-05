import { useState, useEffect } from 'react';

function BatteryStatus() {
  const [batteryLevel, setBatteryLevel] = useState(50);
  const [isCharging, setIsCharging] = useState(false);
  
  useEffect(() => {
    // Function to fetch battery status from backend
    const fetchBatteryStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/system/battery');
        if (response.ok) {
          const data = await response.json();
          setBatteryLevel(data.level);
          setIsCharging(data.charging);
        }
      } catch (error) {
        console.error('Failed to fetch battery status:', error);
      }
    };
    
    // Initial fetch
    fetchBatteryStatus();
    
    // Fetch every 30 seconds
    const interval = setInterval(fetchBatteryStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Determine color based on battery level and charging state
  const getBatteryColor = () => {
    if (isCharging) return '#4ade80'; // Green when charging
    if (batteryLevel <= 15) return '#ef4444'; // Red when critical
    if (batteryLevel <= 30) return '#f97316'; // Orange when low
    return '#4ade80'; // Green otherwise
  };
  
  return (
    <div className="battery-indicator">
      <div className="battery-dot" style={{
        backgroundColor: getBatteryColor()
      }}></div>
      <span className="battery-text">
        {batteryLevel}%{isCharging ? ' ⚡' : ''}
      </span>
    </div>
  );
}

export default BatteryStatus;