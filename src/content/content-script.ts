interface MouseEventData {
  x: number
  y: number
  timestamp: number
  type: 'move' | 'click'
}

export class MetadataRecorder {
  private events: MouseEventData[] = []
  private isRecording: boolean = false
  private startTime: number = 0

  start() {
    this.isRecording = true
    this.events = []
    this.startTime = Date.now()
    window.addEventListener('mousemove', this.handleMouseMove, { capture: true })
    window.addEventListener('click', this.handleClick, { capture: true })
    console.log('Metadata recorder started')
  }

  async stop() {
    this.isRecording = false
    window.removeEventListener('mousemove', this.handleMouseMove, { capture: true })
    window.removeEventListener('click', this.handleClick, { capture: true })
    console.log('Metadata recorder stopped', this.events)
    
    // Do NOT save to IDB here (it would save to the page origin, not extension origin)
    // Just return the events to the background script
    
    return this.events
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isRecording) return
    
    // Record time relative to start
    const relativeTime = Date.now() - this.startTime;

    // Throttle could be added here for optimization
    this.events.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: relativeTime,
      type: 'move'
    })
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.isRecording) return

    const relativeTime = Date.now() - this.startTime;

    this.events.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: relativeTime,
      type: 'click'
    })
  }
  
  getEvents() {
    return this.events
  }
}

// Singleton instance for the actual script
const recorder = new MetadataRecorder()

// Listen for messages from background to start/stop
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_DIMENSIONS') {
        sendResponse({
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio
        });
    } else if (message.type === 'START_RECORDING') {
      recorder.start()
      sendResponse({ status: 'started' })
    } else if (message.type === 'STOP_RECORDING') {
      recorder.stop().then((events) => {
         // Include viewport info
         const viewport = {
             width: window.innerWidth,
             height: window.innerHeight,
             dpr: window.devicePixelRatio
         };
         sendResponse({ status: 'stopped', data: { events, viewport } })
      });
      return true; // Async response
    }
  })
}