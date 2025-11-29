import { useState, useEffect } from 'react'

function Popup() {
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    // Sync state with background
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response && typeof response.isRecording === 'boolean') {
        setIsRecording(response.isRecording);
      }
    });
  }, []);

  const handleStart = async () => {
    // Open the persistent recorder window
    chrome.windows.create({
        url: 'recorder.html',
        type: 'popup',
        width: 400,
        height: 300
    });
    // Close popup immediately
    window.close();
  }

  const handleStop = () => {
    setIsRecording(false)
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
  }

  return (
    <div style={{ width: '300px', padding: '20px', textAlign: 'center' }}>
      <h2>Malu Recorder</h2>
      {!isRecording ? (
        <button onClick={handleStart} data-testid="start-btn">
          Start Recording
        </button>
      ) : (
        <button onClick={handleStop} data-testid="stop-btn">
          Stop Recording
        </button>
      )}
    </div>
  )
}

export default Popup
