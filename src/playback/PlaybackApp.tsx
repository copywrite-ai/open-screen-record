import { useEffect, useRef, useState } from 'react'
import { Renderer, MouseMetadata } from '../core/Renderer'
import { get } from 'idb-keyval'

// --- Icons (Simple SVGs) ---
const PlayIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
const PauseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
const ExportIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>

function PlaybackApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const requestRef = useRef<number>()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string>('')
  const [metadata, setMetadata] = useState<MouseMetadata[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 })
  const [currentTime, setCurrentTime] = useState(0)

  // Export State
  const [isExporting, setIsExporting] = useState(false)
  const exportRecorderRef = useRef<MediaRecorder | null>(null)
  const exportChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const loadData = async () => {
        try {
            const blob = await get<Blob>('latest-video');
            const meta = await get<MouseMetadata[]>('latest-metadata');
            
            if (blob) {
                const url = URL.createObjectURL(blob);
                setVideoSrc(url);
            }
            
            if (meta) {
                setMetadata(meta);
            } else {
                setMetadata([]);
            }
        } catch (e) {
            console.error('Failed to load recording data', e);
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [])

  const onVideoMetadataLoaded = () => {
      if (videoRef.current) {
          const { videoWidth, videoHeight } = videoRef.current;
          if (videoWidth && videoHeight) {
              setDimensions({ width: videoWidth, height: videoHeight });
          }
      }
  }

  useEffect(() => {
    if (canvasRef.current && videoRef.current && metadata) {
      let events: MouseMetadata[] = [];
      let viewport = null;

      if (Array.isArray(metadata)) {
          events = metadata;
      } else if ((metadata as any).events) {
          events = (metadata as any).events;
          viewport = (metadata as any).viewport;
      }
      
      rendererRef.current = new Renderer(
        canvasRef.current,
        videoRef.current,
        events,
        viewport
      )
    }
  }, [metadata, dimensions]) 

  const animate = () => {
    if (isPlaying && rendererRef.current && videoRef.current) {
      rendererRef.current.draw(videoRef.current.currentTime * 1000)
      setCurrentTime(videoRef.current.currentTime)
      requestRef.current = requestAnimationFrame(animate)
    }
  }

  useEffect(() => {
    if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isPlaying])

  const handlePlay = async () => {
    if (isExporting) return;
    if (videoRef.current) {
      try {
        if (isPlaying) {
            videoRef.current.pause()
        } else {
            await videoRef.current.play();
        }
        setIsPlaying(!isPlaying)
      } catch (e) {
          console.error('Play failed:', e);
      }
    }
  }
  
  const handleExport = async () => {
      if (!canvasRef.current || !videoRef.current) return;
      
      setIsExporting(true);
      setIsPlaying(true); 
      
      videoRef.current.currentTime = 0;
      
      const stream = canvasRef.current.captureStream(60);
      const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 8000000
      });
      
      exportRecorderRef.current = recorder;
      exportChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) exportChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
          const blob = new Blob(exportChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `malu-export-${Date.now()}.webm`;
          a.click();
          
          setIsExporting(false);
          setIsPlaying(false);
      };
      
      recorder.start();
      try {
          await videoRef.current.play();
      } catch (e) {
          console.error('Export play failed:', e);
          setIsExporting(false);
          setIsPlaying(false);
      }
  }
  
  const onVideoEnded = () => {
      setIsPlaying(false);
      if (isExporting && exportRecorderRef.current && exportRecorderRef.current.state !== 'inactive') {
          exportRecorderRef.current.stop();
          videoRef.current?.pause();
      }
  }

  if (isLoading) return <div style={styles.loading}>Loading...</div>
  if (!videoSrc) return <div style={styles.loading}>No recording found.</div>

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>Malu Editor <span style={styles.version}>v1.0.3</span></div>
        <button 
            onClick={handleExport}
            disabled={isExporting || isPlaying}
            style={{...styles.exportBtn, opacity: (isExporting || isPlaying) ? 0.5 : 1}}
        >
            <ExportIcon />
            {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </header>

      {/* Main Workspace */}
      <div style={styles.workspace}>
          {/* Left Sidebar */}
          <div style={styles.sidebar}>
             <div style={styles.sidebarItemActive}>Media</div>
             <div style={styles.sidebarItem}>Text</div>
             <div style={styles.sidebarItem}>Audio</div>
          </div>

          {/* Center Stage */}
          <div style={styles.centerStage}>
              <div style={styles.previewContainer}>
                  <div style={{...styles.videoWrapper, aspectRatio: `${dimensions.width}/${dimensions.height}`}}>
                    <video 
                      ref={videoRef} 
                      src={videoSrc}
                      controls={false}
                      crossOrigin="anonymous"
                      style={{ 
                        ...styles.videoElement,
                        opacity: isPlaying ? 0 : 1, 
                        zIndex: isPlaying ? -1 : 1,
                        pointerEvents: isPlaying ? 'none' : 'auto'
                      }} 
                      onEnded={onVideoEnded}
                      onLoadedMetadata={onVideoMetadataLoaded}
                    />
                    <canvas 
                      ref={canvasRef}
                      width={dimensions.width} 
                      height={dimensions.height}
                      style={{ 
                         ...styles.videoElement,
                         backgroundColor: '#000', 
                         zIndex: 5,
                         opacity: isPlaying ? 1 : 0,
                         pointerEvents: isPlaying ? 'auto' : 'none'
                      }}
                    />
                  </div>
              </div>

              {/* Timeline Area */}
              <div style={styles.timelineArea}>
                  <div style={styles.timelineControls}>
                      <button onClick={handlePlay} style={styles.playBtn}>
                          {isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>
                      <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>
                  </div>
                  <div style={styles.timelineTrack}>
                      <div style={styles.trackLabel}>Video 1</div>
                      <div style={styles.trackContent}>
                          <div style={styles.clip}>Recording 001</div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Panel */}
          <div style={styles.rightPanel}>
              <h3 style={styles.panelTitle}>Properties</h3>
              <div style={styles.propertyGroup}>
                  <label style={styles.label}>Zoom Intensity</label>
                  <input type="range" min="0" max="100" style={styles.range} />
              </div>
              <div style={styles.propertyGroup}>
                  <label style={styles.label}>Background</label>
                  <div style={{display: 'flex', gap: 8}}>
                      <div style={{...styles.colorSwatch, background: 'linear-gradient(45deg, #0093E9, #80D0C7)'}} />
                      <div style={{...styles.colorSwatch, background: '#333'}} />
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#1e1e1e',
        color: '#e0e0e0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    loading: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1e1e1e', color: '#fff'
    },
    header: {
        height: '50px',
        background: '#252526',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
    },
    logo: { fontWeight: 700, fontSize: '16px' },
    version: { fontSize: '10px', color: '#666', marginLeft: '5px', background: '#333', padding: '2px 4px', borderRadius: '4px' },
    exportBtn: {
        background: '#007AFF',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    workspace: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
    },
    sidebar: {
        width: '60px',
        background: '#252526',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '10px',
    },
    sidebarItem: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999', cursor: 'pointer', marginBottom: '10px' },
    sidebarItemActive: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', background: '#333', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px' },
    centerStage: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    },
    previewContainer: {
        flex: 1,
        background: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'hidden',
    },
    videoWrapper: {
        position: 'relative',
        width: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    },
    videoElement: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    timelineArea: {
        height: '140px',
        background: '#252526',
        borderTop: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
    },
    timelineControls: {
        height: '40px',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '10px',
    },
    playBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' },
    timeDisplay: { fontFamily: 'monospace', fontSize: '12px', color: '#999' },
    timelineTrack: {
        flex: 1,
        padding: '10px 20px',
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
    },
    trackLabel: { width: '60px', fontSize: '12px', color: '#999', paddingTop: '6px' },
    trackContent: { flex: 1, position: 'relative', background: '#1e1e1e', borderRadius: '4px', height: '40px' },
    clip: { position: 'absolute', left: 0, width: '100%', height: '100%', background: '#3A3A3C', border: '1px solid #007AFF', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '4px' },
    rightPanel: {
        width: '280px',
        background: '#252526',
        borderLeft: '1px solid #333',
        padding: '20px',
    },
    panelTitle: { fontSize: '12px', textTransform: 'uppercase', color: '#999', marginBottom: '20px' },
    propertyGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '12px', marginBottom: '8px', color: '#ccc' },
    range: { width: '100%' },
    colorSwatch: { width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #fff', cursor: 'pointer' },
}

export default PlaybackApp
