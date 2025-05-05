import { FiAlertTriangle } from "react-icons/fi"
import Lumi from "../components/Lumi"
import BatteryStatus from "../components/BatteryStatus"
import ControlBar from "../components/ControlBar"

function AlertPage() {
  return (
    <div className="screen-container alert-screen" style={{ width: "800px", height: "480px", maxWidth: "100vw", maxHeight: "100vh" }}>      
      {/* Content area with optimized sizing */}
      <div className="content-area" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", height: "400px", position: "relative" }}>
        {/* Optimize alert icon size for 800x480 */}
        <FiAlertTriangle className="alert-icon" style={{ fontSize: "100px", position: "relative", zIndex: 1, marginBottom: "2px" }} />
        
        {/* Optimize text size for 800x480 */}
        <h2 className="alert-text" style={{ fontSize: "42px", position: "relative", zIndex: 1, marginBottom: "200px" }}>Wake Up!</h2>
        <div style={{ position: "absolute", bottom: "150px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
          <Lumi />
        </div>
      </div>

      {/* Consistent control bar */}
      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default AlertPage