/* ---------------------------------------------------------------------------
 * Social brand marks.
 *
 * Upstream imports Instagram / Linkedin / Youtube from lucide-react, but Ekatva
 * OS is on lucide-react v1, which removed brand icons (they are trademarks, not
 * UI glyphs). Downgrading lucide for the footer would change every icon in the
 * app, so the three marks the footer needs are inlined here instead.
 *
 * The signature mirrors a lucide icon - `size` and `className` - so the
 * `socials` array in FooterCompact keeps its original shape.
 * ------------------------------------------------------------------------- */
import type { SVGProps } from 'react'

type BrandIconProps = Omit<SVGProps<SVGSVGElement>, 'size'> & { size?: number | string }

function base({ size = 24, ...rest }: BrandIconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
    ...rest,
  }
}

export function Instagram(props: BrandIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 6.32a3.52 3.52 0 1 0 0 7.04 3.52 3.52 0 0 0 0-7.04Zm0 5.81a2.29 2.29 0 1 1 0-4.58 2.29 2.29 0 0 1 0 4.58Zm4.48-5.95a.82.82 0 1 1-1.64 0 .82.82 0 0 1 1.64 0Z" />
    </svg>
  )
}

export function Linkedin(props: BrandIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm6.5 0h3.83v1.64h.05c.53-1 1.84-2.06 3.78-2.06 4.04 0 4.79 2.66 4.79 6.12V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21h-4V9Z" />
    </svg>
  )
}

export function Youtube(props: BrandIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M23.5 6.9a3.02 3.02 0 0 0-2.12-2.14C19.5 4.25 12 4.25 12 4.25s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.9C0 8.79 0 12 0 12s0 3.21.5 5.1a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.21 24 12 24 12s0-3.21-.5-5.1ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
    </svg>
  )
}
