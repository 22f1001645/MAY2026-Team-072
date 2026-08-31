/* ---------------------------------------------------------------------------
 * Participation certificates.
 *
 * A student who travelled across a city to spend a Saturday with strangers
 * currently leaves with a row in a table. This turns an attendance record — one
 * the organiser physically verified by scanning them at the door — into
 * something they can keep and post.
 *
 * Rendered on a canvas in the browser rather than generated server-side, for
 * three reasons: it needs no new dependency, no storage, and no endpoint; and
 * because the record it attests to is already the server's, the image is a
 * rendering of that truth rather than a second copy of it that could drift.
 *
 * It deliberately says "attended", never "certifies" or "awards": this is a
 * participation record issued by a student movement, and overclaiming on a
 * shareable image would be the kind of thing an institution has to walk back.
 * ------------------------------------------------------------------------- */

const TEAL = '#5CE6C9'
const GOLD = '#FFCF96'
const INK = '#F8F8F8'
const MUTED = '#AAAAAA'

export type CertificateDetails = {
  studentName: string
  eventTitle: string
  eventDate: string
  city?: string | null
  venue?: string | null
  /** The registration id — printed small, so a claim can be checked against the roster. */
  reference?: string | null
}

/** 2× the CSS size, so the PNG stays crisp when opened full-screen or printed. */
const W = 2000
const H = 1414 // A4-ish landscape proportion

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Draw text, shrinking the font until it fits.
 *
 * Event titles run from "Coffee & Code" to "Ekatva Hyderabad — Regional Fest",
 * and a certificate whose headline overflows the border is worse than one set a
 * little smaller.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centreX: number,
  y: number,
  maxWidth: number,
  startSize: number,
  weight = '700',
) {
  let size = startSize
  do {
    ctx.font = `${weight} ${size}px Poppins, Arial, sans-serif`
    size -= 4
  } while (ctx.measureText(text).width > maxWidth && size > 24)
  ctx.fillText(text, centreX, y)
}

function draw(ctx: CanvasRenderingContext2D, d: CertificateDetails) {
  // Ground — the brand kit's Oneness Black, warmed slightly so the teal reads.
  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W * 0.5, H * 0.1, 0, W * 0.5, H * 0.1, W * 0.8)
  glow.addColorStop(0, 'rgba(92, 230, 201, 0.13)')
  glow.addColorStop(1, 'rgba(5, 5, 5, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(92, 230, 201, 0.45)'
  ctx.lineWidth = 3
  roundRect(ctx, 60, 60, W - 120, H - 120, 28)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 207, 150, 0.22)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 84, 84, W - 168, H - 168, 20)
  ctx.stroke()

  ctx.textAlign = 'center'

  ctx.fillStyle = TEAL
  ctx.font = '700 30px Poppins, Arial, sans-serif'
  ctx.letterSpacing = '10px'
  ctx.fillText('EKATVA', W / 2, 250)
  ctx.fillStyle = GOLD
  ctx.font = '500 19px Poppins, Arial, sans-serif'
  ctx.fillText('UNITE · INSPIRE · CELEBRATE', W / 2, 300)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = MUTED
  ctx.font = '400 34px Poppins, Arial, sans-serif'
  ctx.fillText('This is to record that', W / 2, 440)

  ctx.fillStyle = INK
  fitText(ctx, d.studentName, W / 2, 580, W - 460, 108)

  ctx.strokeStyle = 'rgba(92, 230, 201, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 300, 630)
  ctx.lineTo(W / 2 + 300, 630)
  ctx.stroke()

  ctx.fillStyle = MUTED
  ctx.font = '400 34px Poppins, Arial, sans-serif'
  ctx.fillText('attended', W / 2, 720)

  ctx.fillStyle = GOLD
  fitText(ctx, d.eventTitle, W / 2, 830, W - 400, 72)

  const place = [d.venue, d.city].filter(Boolean).join(', ')
  ctx.fillStyle = INK
  ctx.font = '400 36px Poppins, Arial, sans-serif'
  ctx.fillText(d.eventDate, W / 2, 920)
  if (place) {
    ctx.fillStyle = MUTED
    ctx.font = '400 30px Poppins, Arial, sans-serif'
    ctx.fillText(place, W / 2, 972)
  }

  ctx.fillStyle = MUTED
  ctx.font = '400 25px Poppins, Arial, sans-serif'
  ctx.fillText('Attendance verified at the venue by the organising team.', W / 2, 1140)
  ctx.fillStyle = 'rgba(170, 170, 170, 0.75)'
  ctx.font = '400 22px Poppins, Arial, sans-serif'
  ctx.fillText('A student initiative of the IIT Madras BS ecosystem', W / 2, 1186)

  if (d.reference) {
    // Small and quiet, but present: it is what makes the claim checkable
    // against the roster rather than merely decorative.
    ctx.fillStyle = 'rgba(170, 170, 170, 0.5)'
    ctx.font = '400 19px monospace'
    ctx.fillText(`Ref ${d.reference}`, W / 2, 1275)
  }
}

/** Render the certificate and hand the PNG to the browser. */
export async function downloadCertificate(d: CertificateDetails): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot render the certificate.')

  // Poppins is loaded by index.html as a webfont. Without waiting, the first
  // certificate of a session renders in the fallback serif — the fonts are
  // there, just not parsed yet.
  if (document.fonts?.ready) {
    try {
      await document.fonts.load('700 108px Poppins')
      await document.fonts.ready
    } catch {
      // A missing webfont is a cosmetic problem, not a reason to refuse.
    }
  }

  draw(ctx, d)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('The certificate could not be saved.')

  const slug = d.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ekatva-certificate-${slug}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
