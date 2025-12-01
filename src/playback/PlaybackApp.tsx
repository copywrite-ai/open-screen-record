import { useEffect, useRef, useState } from 'react'
import { Renderer, MouseMetadata } from '../core/Renderer'
import { get } from 'idb-keyval'

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

  useEffect(() => {
    const loadData = async () => {
        try {
            console.log('Loading data from IDB...');
            const blob = await get<Blob>('latest-video');
            const meta = await get<MouseMetadata[]>('latest-metadata');
            
            if (blob) {
                console.log(`Loaded Blob: ${blob.size} bytes, type: ${blob.type}`);
                const url = URL.createObjectURL(blob);
                setVideoSrc(url);
            } else {
                console.error('No blob found in IDB');
            }

            if (meta) {
                console.log(`Loaded Metadata: ${Array.isArray(meta) ? meta.length : (meta as any).events?.length} events`);
                setMetadata(meta);
            } else {
                console.warn('No metadata found, defaulting to empty');
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
              console.log(`Video dimensions loaded: ${videoWidth}x${videoHeight}`);
              setDimensions({ width: videoWidth, height: videoHeight });
          }
      }
  }

  const [isExporting, setIsExporting] = useState(false)
  const exportRecorderRef = useRef<MediaRecorder | null>(null)
  const exportChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (canvasRef.current && videoRef.current && metadata) {
      // Handle both old array format and new object format
      let events: MouseMetadata[] = [];
      let viewport = null;

      if (Array.isArray(metadata)) {
          events = metadata;
      } else if ((metadata as any).events) {
          events = (metadata as any).events;
          viewport = (metadata as any).viewport;
      }
      
      console.log('Initializing Renderer with', events.length, 'events. Viewport:', viewport);
      
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
      setIsPlaying(true); // Start renderer loop
      
      // Reset video
      videoRef.current.currentTime = 0;
      
      // Create stream from canvas
      // 60 FPS for smooth export
      const stream = canvasRef.current.captureStream(60);
      
      // Init Recorder
      const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 8000000
      });
      
      exportRecorderRef.current = recorder;
      exportChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
              exportChunksRef.current.push(e.data);
          }
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
      
      // Play video (which triggers animate loop via isPlaying)
      try {
          await videoRef.current.play();
      } catch (e) {
          console.error('Export play failed:', e);
          setIsExporting(false);
          setIsPlaying(false);
      }
  }
  
  // Hook into onEnded to stop export
  const onVideoEnded = () => {
      setIsPlaying(false);
      if (isExporting && exportRecorderRef.current && exportRecorderRef.current.state !== 'inactive') {
          exportRecorderRef.current.stop();
          videoRef.current?.pause();
      }
  }

  if (isLoading) return <div>Loading recording...</div>
  if (!videoSrc) return <div>No recording found. Please record something first.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1>Malu Editor</h1>
      
      {/* Debug Info */}
      <div style={{ 
          background: '#eee', 
          padding: '10px', 
          marginBottom: '10px', 
          fontSize: '12px', 
          fontFamily: 'monospace',
          border: '1px solid #ccc',
          width: '100%',
          maxWidth: '1000px'
      }}>
          <strong>Debug Info:</strong><br/>
          Metadata Events: {metadata ? (Array.isArray(metadata) ? metadata.length : (metadata as any).events?.length) : 'null'}<br/>
          Video Dims: {dimensions.width} x {dimensions.height}<br/>
          IDB Check: {!metadata ? 'EMPTY' : 'OK'}
      </div>
      
      <div style={{ marginBottom: '10px', zIndex: 100 }}>
        <button 
            onClick={handlePlay} 
            disabled={isExporting}
            style={{ fontSize: '16px', padding: '8px 16px', cursor: 'pointer', opacity: isExporting ? 0.5 : 1 }}>
            {isPlaying && !isExporting ? 'Stop & Edit' : 'Play Rendered'}
        </button>
        <button 
            onClick={handleExport}
            disabled={isExporting || isPlaying}
            style={{ marginLeft: '10px', fontSize: '16px', padding: '8px 16px', cursor: 'pointer', opacity: (isExporting || isPlaying) ? 0.5 : 1 }}>
            {isExporting ? 'Exporting...' : 'Export to WebM'}
        </button>
      </div>

      <div style={{ position: 'relative', border: '1px solid #ccc', width: 1000, maxWidth: '100%', aspectRatio: `${dimensions.width}/${dimensions.height}`, overflow: 'hidden' }}>
         {/* Video element must be visible in DOM for drawImage to work. */}
        <video 
          ref={videoRef} 
          src={videoSrc}
          controls={!isExporting}
          crossOrigin="anonymous"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'absolute',
            top: 0, 
            left: 0,
            // Hide visually but keep in DOM
            opacity: isPlaying ? 0 : 1, 
            zIndex: isPlaying ? -1 : 1,
            pointerEvents: isPlaying ? 'none' : 'auto'
          }} 
          onEnded={onVideoEnded}
          onLoadedMetadata={onVideoMetadataLoaded}
          onError={(e) => console.error('Video error:', e)}
        />
        <canvas 
          ref={canvasRef}
          width={dimensions.width} 
          height={dimensions.height}
          style={{ 
             width: '100%',
             height: '100%',
             objectFit: 'contain',
             backgroundColor: '#000', 
             position: 'absolute',
             top: 0,
             left: 0,
             zIndex: 5,
             opacity: isPlaying ? 1 : 0,
             pointerEvents: isPlaying ? 'auto' : 'none'
          }}
        />
      </div>
      
      {isExporting && (
          <div style={{ marginTop: '20px', color: '#666' }}>
              Rendering video... do not close this tab.
          </div>
      )}
    </div>
  )
}

export default PlaybackApp
