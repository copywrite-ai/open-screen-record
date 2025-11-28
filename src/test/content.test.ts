import { MetadataRecorder } from '../content/content-script'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('MetadataRecorder', () => {
  let recorder: MetadataRecorder

  beforeEach(() => {
    recorder = new MetadataRecorder()
    // Mock Date.now to have consistent timestamps if needed, 
    // but for simplicity we'll just check existence
  })

  it('should record mouse movements when started', () => {
    recorder.start()
    
    const event = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 200,
    })
    window.dispatchEvent(event)

    const events = recorder.getEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      x: 100,
      y: 200,
      type: 'move'
    })
  })

  it('should record clicks when started', () => {
    recorder.start()
    
    const event = new MouseEvent('click', {
      clientX: 150,
      clientY: 250,
    })
    window.dispatchEvent(event)

    const events = recorder.getEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      x: 150,
      y: 250,
      type: 'click'
    })
  })

  it('should not record events after stopped', () => {
    recorder.start()
    recorder.stop()
    
    const event = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 200,
    })
    window.dispatchEvent(event)

    const events = recorder.getEvents()
    expect(events).toHaveLength(0) // Should be empty as it was reset or not added
  })
  
  it('should clear previous events on restart', () => {
     recorder.start()
     window.dispatchEvent(new MouseEvent('click'))
     recorder.stop()
     
     recorder.start()
     expect(recorder.getEvents()).toHaveLength(0)
  })
})
