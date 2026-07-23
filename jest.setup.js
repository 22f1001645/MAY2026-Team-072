import '@testing-library/jest-dom'

// jsdom doesn't implement HTMLMediaElement.play() — mock it globally
// so any component that calls videoRef.current.play() doesn't throw.
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: jest.fn(),
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  writable: true,
  value: jest.fn(),
})

// Suppress "not implemented" console errors from jsdom for media elements
const originalConsoleError = console.error
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: HTMLMediaElement')
    ) return
    originalConsoleError(...args)
  }
})

afterEach(() => {
  console.error = originalConsoleError
})
