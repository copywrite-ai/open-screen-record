import { render, screen } from '@testing-library/react'
import App from './App'
import { describe, it, expect } from 'vitest'
import React from 'react'

describe('App Component', () => {
  it('renders the main title', () => {
    render(<App />)
    expect(screen.getByText('Malu Recorder')).toBeInTheDocument()
  })
})
