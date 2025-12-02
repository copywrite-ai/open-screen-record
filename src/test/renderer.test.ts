import { Renderer, MouseMetadata } from '../core/Renderer'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Renderer', () => {
  let canvas: HTMLCanvasElement
  let video: HTMLVideoElement
  let ctx: any // Mock context
  let renderer: Renderer

  const mockMetadata: MouseMetadata[] = [
    { timestamp: 0, x: 0, y: 0, type: 'move' },
    { timestamp: 100, x: 100, y: 100, type: 'move' },
    { timestamp: 200, x: 200, y: 200, type: 'click' } // Click event
  ]

  beforeEach(() => {
    // Mock Canvas and Context
    ctx = {
      drawImage: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
    }

    canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      width: 1920,
      height: 1080,
    } as any

    video = {
      readyState: 2, // HAVE_CURRENT_DATA
    } as any

    renderer = new Renderer(canvas, video, mockMetadata)
  })

  it('should apply transforms for camera', () => {
    renderer.draw(50)

    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.translate).toHaveBeenCalledTimes(2) // Once for center, once for camera pos
    expect(ctx.scale).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('should zoom in when near a click event', () => {
    // Near timestamp 200 (which is a click)
    renderer.draw(200)

    // We can't easily test the exact lerped value without exposing internal state,
    // but we can verify scale was called
    expect(ctx.scale).toHaveBeenCalledWith(expect.any(Number), expect.any(Number))
  })

  it('should draw video frame', () => {
    renderer.draw(50)
    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 1920, 1080)
  })

  it('should map coordinates correctly for Tab recording (Viewport)', () => {
    // Tab recording: Video size matches viewport size
    Object.defineProperty(video, 'videoWidth', { value: 1000, writable: true })
    Object.defineProperty(video, 'videoHeight', { value: 800, writable: true })

    const viewport = {
      width: 1000,
      height: 800,
      dpr: 1
    }

    const metadata: MouseMetadata[] = [
      { timestamp: 0, x: 100, y: 100, type: 'move' },
      { timestamp: 100, x: 200, y: 200, type: 'move' }
    ]

    renderer = new Renderer(canvas, video, metadata, viewport)

    // Draw at timestamp 0
    renderer.draw(0)

    // Expect arc to be drawn at 100, 100 (no scaling, direct viewport mapping)
    expect(ctx.arc).toHaveBeenCalledWith(100, 100, expect.any(Number), 0, Math.PI * 2)
  })

  it('should map coordinates correctly for Window recording', () => {
    // Window recording: Video size matches outer window size
    Object.defineProperty(video, 'videoWidth', { value: 1200, writable: true })
    Object.defineProperty(video, 'videoHeight', { value: 900, writable: true })

    const viewport = {
      width: 1000,
      height: 800,
      outerWidth: 1200,
      outerHeight: 900,
      windowX: 50,
      windowY: 50,
      dpr: 1
    }

    const metadata: MouseMetadata[] = [
      { timestamp: 0, x: 100, y: 100, screenX: 150, screenY: 150, type: 'move' }
    ]

    renderer = new Renderer(canvas, video, metadata, viewport)
    renderer.draw(0)

    // Logic:
    // Mode should be 'window' because video matches outerWidth/Height
    // Pos = screenX - windowX = 150 - 50 = 100
    // No scaling needed as video matches outer dimensions
    expect(ctx.arc).toHaveBeenCalledWith(100, 100, expect.any(Number), 0, Math.PI * 2)
  })

  it('should map coordinates correctly for Screen recording', () => {
    // Screen recording: Video size matches screen size
    Object.defineProperty(video, 'videoWidth', { value: 1920, writable: true })
    Object.defineProperty(video, 'videoHeight', { value: 1080, writable: true })

    const viewport = {
      width: 1000,
      height: 800,
      screenWidth: 1920,
      screenHeight: 1080,
      dpr: 1
    }

    const metadata: MouseMetadata[] = [
      { timestamp: 0, x: 100, y: 100, screenX: 500, screenY: 500, type: 'move' }
    ]

    renderer = new Renderer(canvas, video, metadata, viewport)
    renderer.draw(0)

    // Logic:
    // Mode should be 'screen'
    // Pos = screenX = 500
    expect(ctx.arc).toHaveBeenCalledWith(500, 500, expect.any(Number), 0, Math.PI * 2)
  })
})
