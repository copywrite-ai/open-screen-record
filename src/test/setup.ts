import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Chrome API
global.chrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
        },
        getManifest: vi.fn(() => ({
            content_scripts: [{ js: ['content-script.js'] }]
        })),
        lastError: null
    },
    tabs: {
        query: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        get: vi.fn(),
        sendMessage: vi.fn(),
    },
    windows: {
        create: vi.fn(),
        update: vi.fn(),
    },
    action: {
        onClicked: {
            addListener: vi.fn(),
        },
    },
    scripting: {
        executeScript: vi.fn(),
    },
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
        },
    },
} as any

// Mock Canvas Context
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') {
        return {
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
            shadowColor: '',
            shadowBlur: 0,
            shadowOffsetY: 0,
        } as any
    }
    return null
})

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(performance.now())
    return 0
}
global.cancelAnimationFrame = (id: number) => {
    // No-op for synchronous execution
}
