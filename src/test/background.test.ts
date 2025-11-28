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

  it('should handle START_RECORDING message and setup offscreen', async () => {
    const sendResponse = vi.fn()
    const message = { type: 'START_RECORDING' }
    
    await handleMessage(message as any, {} as any, sendResponse)
    
    expect(mockCreateDocument).toHaveBeenCalled()
    expect(mockSendMessage).toHaveBeenCalledWith({ type: 'START_RECORDING', target: 'offscreen' })
    expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'START_RECORDING' })
    expect(sendResponse).toHaveBeenCalledWith({ status: 'started' })
  })

  it('should handle STOP_RECORDING message', async () => {
    const sendResponse = vi.fn()
    const message = { type: 'STOP_RECORDING' }
    
    await handleMessage(message as any, {} as any, sendResponse)
    
    expect(mockSendMessage).toHaveBeenCalledWith({ type: 'STOP_RECORDING', target: 'offscreen' })
    expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'STOP_RECORDING' })
    expect(sendResponse).toHaveBeenCalledWith({ status: 'stopped' })
  })
})
