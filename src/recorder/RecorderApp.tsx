import { useEffect, useState, useRef } from 'react'
import { set } from 'idb-keyval'

function RecorderApp() {
  const [status, setStatus] = useState<'setup' | 'ready' | 'recording' | 'saving' | 'error'>('setup')
  const [error, setError] = useState('')

  const targetTabIdRef = useRef<number | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const metadataSyncPromise = useRef<Promise<void> | null>(null)

  useEffect(() => {
    // Parse targetTabId from URL
    const params = new URLSearchParams(window.location.search);
    const tabId = params.get('targetTabId');
    if (tabId) {
      const id = parseInt(tabId, 10);
      targetTabIdRef.current = id;
    }
  }, [])
  
  const syncMetadata = () => {
      if (!metadataSyncPromise.current) {
           console.log('Starting metadata sync...');
           metadataSyncPromise.current = new Promise(resolve => {
               chrome.runtime.sendMessage({ 
                    type: 'BROADCAST_STOP',
                    targetTabId: targetTabIdRef.current // Use Ref for fresh value
                }, (response) => {
                    console.log('Metadata sync response:', response);
                    resolve();
                });
           });
      }
      return metadataSyncPromise.current;
  }

  const setupRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      
      // If user cancels or stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
          // If we are in recording state, this means the user clicked the system "Stop" button.
          // We MUST trigger metadata sync immediately, but we can't stop the recorder 
          // because the stream ending stops it automatically.
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              syncMetadata();
              // No need to call mediaRecorder.stop(), it will happen automatically.
          } else {
              setStatus('setup');
          }
      };

      setStatus('ready');
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') { // Ignore user cancel
          setError(err.message || 'Failed to setup stream');
          setStatus('error');
      }
    }
  }

  const startRecording = async () => {
    if (!streamRef.current) return;

    try {
      // 1. Switch to Target Tab (if we know it)
      if (targetTabIdRef.current) {
          await chrome.tabs.update(targetTabIdRef.current, { active: true });
          // Optional: Bring window to front if needed
          const tab = await chrome.tabs.get(targetTabIdRef.current);
          if (tab.windowId) {
              await chrome.windows.update(tab.windowId, { focused: true });
          }
      }

      // 2. Start Recording
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      metadataSyncPromise.current = null; // Reset sync promise

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setStatus('saving');
        
        // CRITICAL: Wait for Metadata to be synced before saving everything.
        // This handles the case where the stream ended externally (system button).
        if (!metadataSyncPromise.current) {
            console.log('onstop called but sync not started, starting now...');
            syncMetadata();
        }
        await metadataSyncPromise.current;
        
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log(`Recording finished. Size: ${blob.size}`);
        
        if (blob.size > 0) {
            await set('latest-video', blob);
            
            // Send message to background to signal finish (and maybe close tab?)
             chrome.runtime.sendMessage({ type: 'RECORDING_FINISHED' });

            // Open Playback
            window.open('playback.html', '_blank');
            window.close(); // Close recorder window
        } else {
            setError('Recording failed: No data');
            setStatus('error');
        }
        
        // Cleanup
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
      };

      recorder.start(200);
      setStatus('recording');

      // 3. Notify background to start logging metadata
      chrome.runtime.sendMessage({ 
          type: 'BROADCAST_START',
          targetTabId: targetTabIdRef.current 
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start');
      setStatus('error');
    }
  }

  const stopRecording = async () => {
    // Manual Stop
    syncMetadata(); // Start syncing immediately
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop(); // This will trigger onstop
    }
  }

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: '#f5f5f7'
    }}>
      <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Malu Recorder</h2>
        
        {status === 'setup' && (
            <div>
                <p style={{ marginBottom: '24px', color: '#666' }}>
                    Select the window or screen you want to record.
                </p>
                <button 
                    onClick={setupRecording}
                    style={buttonStyle}
                >
                    Select Source
                </button>
            </div>
        )}

        {status === 'ready' && (
            <div>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e5e5ea', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#34c759' }} />
                    </div>
                    <p style={{ fontWeight: 500 }}>Source Selected</p>
                </div>
                <button 
                    onClick={startRecording}
                    style={{...buttonStyle, background: '#FF3B30'}}
                >
                    Start Recording
                </button>
                <button 
                    onClick={() => setStatus('setup')}
                    style={{...textButtonStyle, marginTop: '10px'}}
                >
                    Change Source
                </button>
            </div>
        )}
        
        {status === 'recording' && (
          <div>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FF3B30', margin: '0 auto 10px', animation: 'pulse 1s infinite' }} />
            <p>Recording in progress...</p>
            <p style={{fontSize: '12px', color: '#999'}}>Switch back to this tab to stop.</p>
            <button onClick={stopRecording} style={{...buttonStyle, background: '#333', marginTop: '20px'}}>
              Stop Recording
            </button>
          </div>
        )}
        
        {status === 'saving' && (
             <div>
                <div className="spinner"></div>
                <p>Processing recording...</p>
             </div>
        )}
        
        {status === 'error' && (
          <div style={{ color: '#FF3B30' }}>
            <p>Error: {error}</p>
            <button onClick={() => setStatus('setup')} style={buttonStyle}>Try Again</button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
            0% { transform: scale(0.95); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(0.95); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const buttonStyle = {
    padding: '12px 24px', 
    fontSize: '16px', 
    fontWeight: 600,
    cursor: 'pointer',
    background: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    width: '100%',
    transition: 'transform 0.1s'
};

const textButtonStyle = {
    padding: '8px', 
    fontSize: '14px', 
    cursor: 'pointer',
    background: 'transparent',
    color: '#007AFF',
    border: 'none',
    width: '100%'
};

export default RecorderApp