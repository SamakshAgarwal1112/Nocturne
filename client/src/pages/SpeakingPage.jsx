import Lumi from "../components/Lumi"
import ControlBar from "../components/ControlBar"
import { TypeAnimation } from 'react-type-animation';

function SpeakingPage({text}) {
  return (
    <div className="screen-container speaking-screen">

      <div className="content-area" style={{ flex: 1, position: "relative" }}>
        {/* Center Lumi in the background */}
        <div style={{ position: "absolute", top: "60px", left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
          <Lumi />
        </div>
        
        <h2 className="question-text" style={{ position: "relative", zIndex: 1 }}>
          <TypeAnimation
            sequence={[text]}
            wrapper="span"
            speed={40} // Medium speed (adjust between 30-50 for medium feel)
            cursor={false} // Removes blinking cursor after typing
          />
        </h2>
      </div>

      <ControlBar onUserSpeaking={() => {}} />
    </div>
  )
}

export default SpeakingPage