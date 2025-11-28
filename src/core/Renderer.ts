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
  private camera: Camera = { x: 0, y: 0, zoom: 1 }

  constructor(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    metadata: MouseMetadata[]
  ) {
    this.canvas = canvas
    this.video = video
    this.metadata = metadata.sort((a, b) => a.timestamp - b.timestamp)
    this.ctx = canvas.getContext('2d')
    
    // Initialize camera center
    if (metadata.length > 0) {
        this.camera.x = metadata[0].x
        this.camera.y = metadata[0].y
    }
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
      // Enhanced Logic:
      // 1. Base zoom is 1.5x (so panning is always visible)
      // 2. Click zoom is 2.5x
      const clickEvent = this.metadata.find(e => 
          e.type === 'click' && Math.abs(e.timestamp - timestamp) < 800
      )
      return clickEvent ? 2.5 : 1.5
  }

  private clamp(value: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, value));
  }

  draw(timestamp: number) {
    if (!this.ctx) return

    // 1. Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const pos = this.getMousePosition(timestamp)
    
    this.ctx.save()

    if (pos) {
        const targetZoom = this.getTargetZoom(timestamp)
        
        // Smooth camera updates
        this.camera.zoom = this.lerp(this.camera.zoom, targetZoom, 0.05)
        
        // Calculate visible area size at current zoom
        // visibleWidth = canvasWidth / zoom
        const visibleW = this.canvas.width / this.camera.zoom
        const visibleH = this.canvas.height / this.camera.zoom
        
        // Target camera position is the mouse position
        // But we must CLAMP it so we don't show black edges
        // The camera center can range from [visibleW/2] to [canvasWidth - visibleW/2]
        const minX = visibleW / 2
        const maxX = this.canvas.width - visibleW / 2
        const minY = visibleH / 2
        const maxY = this.canvas.height - visibleH / 2
        
        const targetX = this.clamp(pos.x, minX, maxX)
        const targetY = this.clamp(pos.y, minY, maxY)

        this.camera.x = this.lerp(this.camera.x, targetX, 0.1) // Slightly faster pan
        this.camera.y = this.lerp(this.camera.y, targetY, 0.1)

        // Apply Transforms
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
        this.ctx.scale(this.camera.zoom, this.camera.zoom)
        this.ctx.translate(-this.camera.x, -this.camera.y)
    } else {
        // Fallback if no metadata: just show full video centered
        // Optional: could add a slow gentle zoom-in effect here too
    }

    // 3. Draw Content
    // Video
    // Note: we draw the video at its original size. 
    // If video resolution != canvas resolution, scaling might be needed here.
    // For MVP we assume 1:1 or handle it simply.
    if (this.video.readyState >= 2) { // HAVE_CURRENT_DATA
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
    }

    // Virtual Mouse
    if (pos) {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
        this.ctx.beginPath()
        this.ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Mouse Ring (Visual flair)
        this.ctx.strokeStyle = 'white'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
    }

    this.ctx.restore()
  }
}
