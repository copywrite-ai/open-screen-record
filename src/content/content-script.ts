interface MouseEventData {
  x: number
  y: number
  screenX: number
  screenY: number
  timestamp: number
  type: 'move' | 'click'
}

export class MetadataRecorder {
  private events: MouseEventData[] = []
  private isRecording: boolean = false
  private startTime: number = 0

  private rafId: number | null = null
  private lastMouseEvent: MouseEvent | null = null

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

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastMouseEvent = null;

    console.log('Metadata recorder stopped', this.events)

    return this.events
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isRecording) return
    this.lastMouseEvent = e;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.processMouseMove);
    }
  }

  private processMouseMove = () => {
    if (!this.lastMouseEvent || !this.isRecording) {
      this.rafId = null;
      return;
    }

    const e = this.lastMouseEvent;
    const relativeTime = Date.now() - this.startTime;

    this.events.push({
      x: e.clientX,
      y: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      timestamp: relativeTime,
      type: 'move'
    })

    this.rafId = null;
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.isRecording) return

    const relativeTime = Date.now() - this.startTime;

    this.events.push({
      x: e.clientX,
      y: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
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
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          windowX: window.screenX,
          windowY: window.screenY,
          dpr: window.devicePixelRatio
        };
        sendResponse({ status: 'stopped', data: { events, viewport } })
      });
      return true; // Async response
    }
  })
}