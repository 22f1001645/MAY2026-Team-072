/**
 * PosterUpload — CAMPAIGN-03 / UI-SPEC E8.
 *
 * Three things about this component are invisible on screen and all three are
 * the ones that go wrong:
 *
 *  1. A rejected upload must always say WHICH rejection it was. The server has
 *     three distinguishable answers — 413 from the app-wide cap, 415
 *     `unsupported_media_type` from the magic-byte sniff, and everything else —
 *     and the one outcome E8 rules out is a silent no-op, which is exactly what
 *     an unhandled promise rejection looks like to an organiser.
 *  2. The zone has to stop accepting input while an upload is in flight. A
 *     second submit mid-flight is the client half of the last-write-wins race
 *     the server resolves on `poster_name`; the disabled zone is what keeps a
 *     user from creating that race by double-clicking.
 *  3. The multipart body must reach `fetch` as a FormData with the file under
 *     the key `poster`. A JSON content type riding along would make the server
 *     parse the body with the wrong boundary, and nothing on screen would say
 *     so — hence the api-level assertion at the bottom of this file.
 *
 * The drag-hover treatment itself is checked by hand (05-VALIDATION.md,
 * Manual-Only Verifications): jsdom fires DragEvent without a real DataTransfer,
 * so a passing assertion here would be about the stub, not about the browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PosterUpload } from '../PosterUpload'
import { ToastProvider } from '../ui'
import { ApiError, api } from '../../lib/api'

const FILE = () => new File(['fake-bytes'], 'poster.png', { type: 'image/png' })

function renderUpload(props: Partial<React.ComponentProps<typeof PosterUpload>> = {}) {
  const onUpload = props.onUpload ?? vi.fn().mockResolvedValue({})
  const utils = render(
    <ToastProvider>
      <PosterUpload posterName={null} onUpload={onUpload} uploading={false} {...props} />
    </ToastProvider>,
  )
  return { ...utils, onUpload }
}

/** The hidden input is the only file-picking surface; userEvent.upload needs it
 *  directly because clicking the card opens a picker jsdom does not implement. */
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement

describe('PosterUpload', () => {
  it('invites a drop and names the accepted formats when there is no poster', () => {
    renderUpload()
    expect(screen.getByText('Drop poster image here, or click to browse')).toBeInTheDocument()
    expect(screen.getByText('PNG, JPG, or WebP — max 5 MB')).toBeInTheDocument()
  })

  it('hands the chosen file to the upload handler exactly once', async () => {
    const { onUpload } = renderUpload()
    const file = FILE()

    await userEvent.upload(fileInput(), file)

    expect(onUpload).toHaveBeenCalledTimes(1)
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('covers the zone and refuses further input while an upload is in flight', async () => {
    const onUpload = vi.fn().mockResolvedValue({})
    renderUpload({ uploading: true, onUpload })

    expect(screen.getByText('Uploading…')).toBeInTheDocument()
    expect(fileInput().disabled).toBe(true)

    // A second pick mid-flight would be the client half of the last-write-wins
    // race; the disabled input is what prevents an organiser creating it.
    await userEvent.upload(fileInput(), FILE())
    expect(onUpload).toHaveBeenCalledTimes(0)
  })

  it.each([
    ['File too large (max 5 MB)', new ApiError('too big', 'payload_too_large', 413)],
    ['Only PNG, JPG, or WebP accepted', new ApiError('nope', 'unsupported_media_type', 415)],
    ['Upload failed. Try again.', new Error('socket hang up')],
  ])('says %s rather than failing silently', async (message, rejection) => {
    const onUpload = vi.fn().mockRejectedValue(rejection)
    renderUpload({ onUpload })

    await userEvent.upload(fileInput(), FILE())

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument())
  })

  it('shows the stored poster with a way to replace it', () => {
    renderUpload({ posterName: 'a3f9b2c1d4e5f60718293a4b5c6d7e8f.png' })

    const img = screen.getByRole('img', { name: /poster/i }) as HTMLImageElement
    expect(img.src.endsWith('a3f9b2c1d4e5f60718293a4b5c6d7e8f.png')).toBe(true)
    expect(screen.getByRole('button', { name: 'Change poster' })).toBeInTheDocument()
    expect(screen.getByText('a3f9b2c1d4e5f60718293a4b5c6d7e8f.png')).toBeInTheDocument()
  })
})

describe('api.uploadPoster', () => {
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ poster_name: 'stored.png' }),
    } as unknown as Response)
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends the file as multipart under the key the server reads', async () => {
    const file = FILE()

    await api.uploadPoster('act-1', file)

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('poster')).toBe(file)
    expect(
      'Content-Type' in (init.headers as Record<string, string>),
      'a JSON content type here makes the server parse the body with the wrong boundary',
    ).toBe(false)
  })
})
