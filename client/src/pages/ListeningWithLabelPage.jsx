import AudioVisualizer from "../components/AudioVisualizer"
import Lumi from "../components/Lumi"
import ControlBar from "../components/ControlBar"

function ListeningWithLabelPage() {
  return (
    <div className="screen-container listening-screen">

      <div className="content-area" style={{ flex: 1, position: "relative" }}>
        {/* Center Lumi in the background */}
        <div style={{ position: "absolute", bottom: "120px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
          <Lumi />
        </div>
        
        <div className="visualizer-container" style={{ 
          maxWidth: "800px", 
          width: "300px", // Increased width
          margin: "0 auto", 
          position: "relative", 
          zIndex: 1,
          height: "120px" // Increased height
        }}>
          <span className="listening-label">Listening</span>
          <AudioVisualizer isActive={true} />
        </div>
      </div>

      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default ListeningWithLabelPage