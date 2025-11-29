export interface MouseMetadata {
  timestamp: number
  x: number
  y: number
  type: 'move' | 'click'
}

interface Camera {
  x: number
  y: number
  zoom: number
}

export class Renderer {
  private canvas: HTMLCanvasElement
  private video: HTMLVideoElement
  private metadata: MouseMetadata[]
  private ctx: CanvasRenderingContext2D | null
  
  // Camera state for smooth transitions
  private camera: Camera;

  constructor(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    metadata: MouseMetadata[]
  ) {
    this.canvas = canvas
    this.video = video
    this.metadata = metadata.sort((a, b) => a.timestamp - b.timestamp)
    this.ctx = canvas.getContext('2d')
    
    // Initialize camera center to CENTER of canvas, not 0,0
    // This prevents the "fly in from corner" effect
    this.camera = { 
        x: canvas.width / 2, 
        y: canvas.height / 2, 
        zoom: 0.9 
    };
    
    // If we have metadata, maybe start at the first mouse pos?
    // But for "Card Style", starting at center is safer.
  }

  // Linear Interpolation
  private lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t
  }

  private getMousePosition(timestamp: number): { x: number; y: number } | null {
    if (this.metadata.length === 0) return null
    
    let prev = this.metadata[0]
    let next = this.metadata[this.metadata.length - 1]

    if (timestamp <= prev.timestamp) return { x: prev.x, y: prev.y }
    if (timestamp >= next.timestamp) return { x: next.x, y: next.y }

    for (let i = 0; i < this.metadata.length - 1; i++) {
      if (this.metadata[i].timestamp <= timestamp && this.metadata[i+1].timestamp >= timestamp) {
        prev = this.metadata[i]
        next = this.metadata[i+1]
        break
      }
    }

    const duration = next.timestamp - prev.timestamp
    if (duration === 0) return { x: prev.x, y: prev.y }

    const progress = (timestamp - prev.timestamp) / duration
    
    return {
      x: this.lerp(prev.x, next.x, progress),
      y: this.lerp(prev.y, next.y, progress)
    }
  }
  
  private getTargetZoom(timestamp: number): number {
      // Logic: Cinematic Style
      // Default 0.9 (Floating, shows gradient borders)
      // Click 1.8 (Focus)
      const clickEvent = this.metadata.find(e => 
          e.type === 'click' && Math.abs(e.timestamp - timestamp) < 800
      )
      return clickEvent ? 1.8 : 0.9
  }

  private clamp(value: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, value));
  }

  private drawBackground() {
      if (!this.ctx) return;
      const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
      gradient.addColorStop(0, '#0093E9');
      gradient.addColorStop(0.5, '#80D0C7');
      gradient.addColorStop(1, '#80D0C7');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(timestamp: number) {
    if (!this.ctx) return

    // 1. Draw Gradient Background
    this.drawBackground();

    const pos = this.getMousePosition(timestamp)
    
    this.ctx.save()

    // --- Camera Logic ---
    // We want the center of the camera to point to the mouse (or center of video).
    // The "World" is the video content.
    
    let targetX, targetY;
    
    const targetZoom = this.getTargetZoom(timestamp)
    this.camera.zoom = this.lerp(this.camera.zoom, targetZoom, 0.05)

    if (pos) {
        // Calculate visible area size in Source Space
        const visibleW = this.canvas.width / this.camera.zoom
        const visibleH = this.canvas.height / this.camera.zoom
        
        // If Zoom < 1, we see MORE than the canvas. Camera should stay centered.
        if (this.camera.zoom < 1.0) {
             targetX = this.canvas.width / 2;
             targetY = this.canvas.height / 2;
        } else {
            // Clamp logic for Zoom > 1
            const minX = visibleW / 2
            const maxX = this.canvas.width - visibleW / 2
            const minY = visibleH / 2
            const maxY = this.canvas.height - visibleH / 2
            
            targetX = this.clamp(pos.x, minX, maxX)
            targetY = this.clamp(pos.y, minY, maxY)
        }
    } else {
        targetX = this.canvas.width / 2
        targetY = this.canvas.height / 2
    }

    this.camera.x = this.lerp(this.camera.x, targetX, 0.08)
    this.camera.y = this.lerp(this.camera.y, targetY, 0.08)

    // --- Apply Transforms ---
    // 1. Move origin to Screen Center
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
    // 2. Scale
    this.ctx.scale(this.camera.zoom, this.camera.zoom)
    // 3. Move origin to Camera Position
    this.ctx.translate(-this.camera.x, -this.camera.y)


    // --- Draw Content ---
    if (this.video.readyState >= 2) {
        this.ctx.save();
        
        // Drop Shadow for the floating card look
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        this.ctx.shadowBlur = 40;
        this.ctx.shadowOffsetY = 20;

        // Crop Logic: REMOVED. 
        // Since we switched to desktopCapture with accurate window/screen selection,
        // we assume the user selected the correct area and we render the full video.
        
        // Destination: Draw at (0,0) because our coordinate system (after T(-Cam))
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
        
        this.ctx.restore();
    }

    // Virtual Mouse
    if (pos) {
        const cursorSize = 24 / (this.camera.zoom * 0.5 + 0.5);
        
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetY = 4;

        this.ctx.fillStyle = '#FF4757'; 
        this.ctx.beginPath()
        this.ctx.arc(pos.x, pos.y, cursorSize, 0, Math.PI * 2)
        this.ctx.fill()
        
        this.ctx.shadowColor = 'transparent';
        this.ctx.strokeStyle = 'white'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
    }

    this.ctx.restore()
  }
}
