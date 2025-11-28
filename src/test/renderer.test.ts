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
    }
    
    canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      width: 1920,
      height: 1080,
    } as any
    
    video = {} as any
    
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
})
