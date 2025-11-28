import { render, screen, fireEvent } from '@testing-library/react'
import Popup from '../components/Popup'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// Mock chrome runtime
const mockSendMessage = vi.fn()
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
  },
} as any

describe('Popup Component', () => {
  beforeEach(() => {
    mockSendMessage.mockClear()
  })

  it('renders Start Recording button initially', () => {
    render(<Popup />)
    expect(screen.getByTestId('start-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('stop-btn')).not.toBeInTheDocument()
  })

  it('sends START_RECORDING message when Start button is clicked', () => {
    render(<Popup />)
    const startBtn = screen.getByTestId('start-btn')
    fireEvent.click(startBtn)

    expect(mockSendMessage).toHaveBeenCalledWith({ type: 'START_RECORDING' })
    // Should toggle to Stop button
    expect(screen.getByTestId('stop-btn')).toBeInTheDocument()
  })

  it('sends STOP_RECORDING message when Stop button is clicked', () => {
    render(<Popup />)
    // First click start
    fireEvent.click(screen.getByTestId('start-btn'))
    
    // Then click stop
    const stopBtn = screen.getByTestId('stop-btn')
    fireEvent.click(stopBtn)

    expect(mockSendMessage).toHaveBeenCalledWith({ type: 'STOP_RECORDING' })
    expect(screen.getByTestId('start-btn')).toBeInTheDocument()
  })
})
