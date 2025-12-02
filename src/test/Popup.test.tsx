// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import Popup from '../components/Popup'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// Mock chrome runtime
// We rely on setup.ts for the base mock
const mockSendMessage = global.chrome.runtime.sendMessage
const mockWindowsCreate = global.chrome.windows.create

describe('Popup Component', () => {
  beforeEach(() => {
    mockSendMessage.mockClear()
    mockWindowsCreate.mockClear()

    // Default mock implementation to handle GET_STATUS
    mockSendMessage.mockImplementation((msg: any, cb: any) => {
      if (msg.type === 'GET_STATUS' && cb) {
        cb({ isRecording: false })
      }
    })

    // Mock window.close
    vi.spyOn(window, 'close').mockImplementation(() => { })
  })

  it('renders Start Recording button initially', () => {
    render(<Popup />)
    expect(screen.getByTestId('start-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('stop-btn')).not.toBeInTheDocument()
  })

  it('opens recorder window when Start button is clicked', () => {
    render(<Popup />)
    const startBtn = screen.getByTestId('start-btn')
    fireEvent.click(startBtn)

    expect(mockWindowsCreate).toHaveBeenCalledWith(expect.objectContaining({
      url: 'recorder.html',
      type: 'popup'
    }))
    expect(window.close).toHaveBeenCalled()
  })

  it('sends STOP_RECORDING message when Stop button is clicked', () => {
    // Mock that we are already recording
    mockSendMessage.mockImplementation((msg: any, cb: any) => {
      if (msg.type === 'GET_STATUS' && cb) {
        cb({ isRecording: true })
      }
    })

    render(<Popup />)
    // Should show stop button immediately
    const stopBtn = screen.getByTestId('stop-btn')
    fireEvent.click(stopBtn)

    expect(mockSendMessage).toHaveBeenCalledWith({ type: 'STOP_RECORDING' })
    // After stop, it sets local state to false, so start button should appear
    expect(screen.getByTestId('start-btn')).toBeInTheDocument()
  })
})
