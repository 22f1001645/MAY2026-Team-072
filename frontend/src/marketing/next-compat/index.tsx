/* ---------------------------------------------------------------------------
 * next-compat — the seam between the Next.js-authored marketing site and this
 * Vite + React Router SPA.
 *
 * The landing page (github.com/Vish2BDev/Ekatva-Website) is a Next.js app. Rather
 * than rewrite ~50 components by hand — and re-inherit every upstream fix as a
 * manual merge — we keep them byte-close to their originals and satisfy the four
 * `next/*` imports they actually use. Upstream changes can then be re-copied.
 *
 * Deliberately NOT a general Next.js polyfill. It covers exactly what the home
 * page's dependency closure imports, and nothing more.
 * ------------------------------------------------------------------------- */
import { forwardRef, type AnchorHTMLAttributes, type ImgHTMLAttributes } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { asset, isExternalHref, marketingUrl } from '../lib/asset'

/* --- next/link ------------------------------------------------------------ */

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  /** next/link props the marketing components pass but that mean nothing here. */
  prefetch?: boolean
  replace?: boolean
  scroll?: boolean
}

/**
 * Routes to react-router for in-app paths, and stays a plain <a> for anything
 * the SPA cannot handle: external URLs, hash links, mailto/tel, and the
 * marketing routes that live on the public site rather than in Ekatva OS.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch: _prefetch, replace, scroll: _scroll, children, ...rest },
  ref,
) {
  if (isExternalHref(href)) {
    // A bare path that is still "external" is an un-ported marketing route, so
    // it has to be resolved against the marketing origin — left as-is it would
    // 404 inside this SPA. Hashes and mailto:/tel: pass through untouched.
    const isRemoteRoute = href.startsWith('/')
    const resolved = isRemoteRoute ? marketingUrl(href) : href
    const leavesSite = isRemoteRoute || /^https?:/i.test(href)
    return (
      <a
        ref={ref}
        href={resolved}
        {...(leavesSite ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {children}
      </a>
    )
  }
  return (
    <RouterLink ref={ref} to={href} replace={replace} {...rest}>
      {children}
    </RouterLink>
  )
})

/* --- next/image ----------------------------------------------------------- */

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string
  /** next/image layout props; `fill` is the only one with a visual effect here. */
  fill?: boolean
  priority?: boolean
  quality?: number
  sizes?: string
  placeholder?: string
  blurDataURL?: string
  unoptimized?: boolean
}

/**
 * next/image's optimiser is a server feature we do not have. A plain <img> with
 * native lazy-loading is the honest equivalent; `fill` is reproduced with the
 * absolute-inset positioning next/image applies for it.
 */
export function Image({
  src,
  alt = '',
  fill,
  priority,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  unoptimized: _unoptimized,
  style,
  ...rest
}: ImageProps) {
  return (
    <img
      src={asset(src)}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style}
      {...rest}
    />
  )
}

/* --- next/navigation ------------------------------------------------------ */

export function usePathname(): string {
  return useLocation().pathname
}

export default Link
