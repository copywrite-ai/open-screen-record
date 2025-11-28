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
    // Get current active tab to record
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.id) {
      setIsRecording(true)
      chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: tab.id })
    } else {
      console.error('No active tab found');
    }
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
