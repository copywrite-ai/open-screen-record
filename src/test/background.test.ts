import { handleMessage } from '../background/service-worker'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock chrome API
const mockCreateDocument = vi.fn()
const mockSendMessage = vi.fn()
const mockTabsQuery = vi.fn()
const mockTabsSendMessage = vi.fn()
const mockGetContexts = vi.fn()

global.chrome = {
  runtime: {
    getContexts: mockGetContexts,
    ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
    sendMessage: mockSendMessage,
  },
  offscreen: {
    createDocument: mockCreateDocument,
    Reason: { USER_MEDIA: 'USER_MEDIA' },
  },
  tabs: {
    query: mockTabsQuery,
    sendMessage: mockTabsSendMessage,
  }
} as any

describe('Background Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContexts.mockResolvedValue([]) // Default: no offscreen doc exists
    mockTabsQuery.mockResolvedValue([{ id: 1 }]) // Default: one active tab
  })

  it('should handle BROADCAST_START message', async () => {
    const sendResponse = vi.fn()
    const message = { type: 'BROADCAST_START', targetTabId: 1 }

    await handleMessage(message as any, {} as any, sendResponse)

    expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'START_RECORDING' })
    // It doesn't call sendResponse for start
  })

  it('should handle BROADCAST_STOP message', async () => {
    const sendResponse = vi.fn()
    const message = { type: 'BROADCAST_STOP', targetTabId: 1 }

    // Mock the async response from tab
    mockTabsSendMessage.mockImplementation((tabId, msg, cb) => {
      if (cb) cb({ data: [] })
    })

    await handleMessage(message as any, {} as any, sendResponse)

    expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'STOP_RECORDING' }, expect.any(Function))
  })
})
