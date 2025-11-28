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
                console.log(`Loaded Metadata: ${meta.length} events`);
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

  useEffect(() => {
    if (canvasRef.current && videoRef.current && metadata) {
      console.log('Initializing Renderer with', metadata.length, 'events');
      rendererRef.current = new Renderer(
        canvasRef.current,
        videoRef.current,
        metadata
      )
    }
  }, [metadata]) 

  const animate = () => {
    if (isPlaying && rendererRef.current && videoRef.current) {
      // Debug log every ~60 frames
      if (Math.random() < 0.02) {
          console.log('Render loop:', {
              currentTime: videoRef.current.currentTime,
              readyState: videoRef.current.readyState,
              videoWidth: videoRef.current.videoWidth,
              paused: videoRef.current.paused
          });
      }
      
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
    if (videoRef.current) {
      try {
        if (isPlaying) {
            videoRef.current.pause()
        } else {
            console.log('Attempting to play video...');
            await videoRef.current.play();
            console.log('Video playing!');
        }
        setIsPlaying(!isPlaying)
      } catch (e) {
          console.error('Play failed:', e);
      }
    }
  }
  
  if (isLoading) return <div>Loading recording...</div>
  if (!videoSrc) return <div>No recording found. Please record something first.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1>Malu Editor</h1>
      
      <div style={{ marginBottom: '10px', zIndex: 100 }}>
        <button onClick={handlePlay} style={{ fontSize: '16px', padding: '8px 16px', cursor: 'pointer' }}>
            {isPlaying ? 'Stop & Edit' : 'Play Rendered'}
        </button>
        <button style={{ marginLeft: '10px', fontSize: '16px', padding: '8px 16px' }}>Export</button>
      </div>

      <div style={{ position: 'relative', border: '1px solid #ccc', width: 1280, height: 720, overflow: 'hidden' }}>
         {/* Video element must be visible in DOM for drawImage to work. */}
        <video 
          ref={videoRef} 
          src={videoSrc}
          controls={true}
          crossOrigin="anonymous"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            // Use opacity 1 temporarily to debug if it's actually playing underneath
            // position: isPlaying ? 'absolute' : 'relative',
            // opacity: isPlaying ? 0 : 1,
            // zIndex: isPlaying ? -1 : 1,
            
            // DEBUG: Just put it on top but small if playing, to see if it moves
            position: 'absolute',
            top: 0, 
            left: 0,
            opacity: 1, 
            zIndex: isPlaying ? 10 : 1, // Keep video ON TOP for now to see if it works at all
            transform: isPlaying ? 'scale(0.2)' : 'none', // Shrink it when playing rendered
            transformOrigin: 'top right'
          }} 
          onEnded={() => setIsPlaying(false)}
          onLoadedData={() => console.log('Video loaded data')}
          onError={(e) => console.error('Video error:', e)}
        />
        <canvas 
          ref={canvasRef}
          width={1280} 
          height={720}
          style={{ 
             width: '100%',
             height: '100%',
             objectFit: 'contain',
             backgroundColor: '#000', 
             position: 'absolute',
             top: 0,
             left: 0,
             zIndex: 5 // Canvas below video for this debug step
          }}
        />
      </div>
    </div>
  )
}

export default PlaybackApp