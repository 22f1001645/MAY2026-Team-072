// The `/vitest` entry point, not the bare package: the bare import registers
// its matchers against jest's `expect` and silently does nothing under vitest.
import '@testing-library/jest-dom/vitest'
