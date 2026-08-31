/* ---------------------------------------------------------------------------
 * Where the marketing site's media and un-ported pages actually live.
 *
 * Only the home page ("/") was ported into Ekatva OS. Its ~540MB of video and
 * imagery — and the six sibling marketing routes (/about, /editions, /join-us,
 * /partner-with-us, /sponsor, and the legal pages) — stay on the deployed
 * marketing site. Links and <img> srcs are rewritten to point there so the repo
 * stays clone-able and the nav never dead-ends on a route this app cannot serve.
 *
 * Override with VITE_MARKETING_ORIGIN to point at a preview deploy or a local
 * copy of the marketing site.
 * ------------------------------------------------------------------------- */

export const MARKETING_ORIGIN =
  import.meta.env.VITE_MARKETING_ORIGIN ?? 'https://ekatvawebsite.vercel.app'

/** Public directories of the marketing site that were not copied into this repo. */
const REMOTE_ASSET_DIRS = ['/images/', '/videos/', '/assets/', '/sounds/']

/**
 * The handful of small assets that ARE vendored into public/marketing/.
 *
 * The logo mark and the orbital composition are chrome the landing page cannot
 * render without, and they are ~140KB together - small enough that making the
 * page depend on an external deploy for them would be a worse trade than the
 * repo weight. Everything heavier (the 6.8MB footer GIF, the gallery, the
 * aftermovie) still resolves to MARKETING_ORIGIN.
 */
const VENDORED_ASSETS: Record<string, string> = {
  '/assets/images/Ekatva Logo.png': '/marketing/ekatva-logo-mark.png',
  '/assets/images/orbit-fallback.png': '/marketing/orbit-fallback.png',
}

/**
 * Marketing routes that exist on the public site but not in this SPA.
 *
 * Anything matching these prefixes is rendered as a real <a> to the marketing
 * origin. Without this the SPA router would swallow the click and fall through
 * to the catch-all route, which sends visitors to a login screen.
 */
const REMOTE_ROUTE_PREFIXES = [
  '/about',
  '/editions',
  '/join-us',
  '/partner-with-us',
  '/sponsor',
  '/privacy',
  '/terms',
]

/** Resolve a marketing-site asset path to a URL this app can actually load. */
export function asset(src: string): string {
  if (/^(https?:|data:|blob:)/i.test(src)) return src
  const path = src.startsWith('/') ? src : `/${src}`
  if (path in VENDORED_ASSETS) return VENDORED_ASSETS[path]
  return REMOTE_ASSET_DIRS.some((dir) => path.startsWith(dir))
    ? `${MARKETING_ORIGIN}${path}`
    : path
}

/**
 * True when an href must bypass the SPA router — because it leaves the site,
 * is a same-page anchor, uses a non-http scheme, or belongs to a marketing
 * route this app does not serve.
 */
export function isExternalHref(href: string): boolean {
  if (!href) return true
  if (/^(https?:|mailto:|tel:)/i.test(href)) return true
  if (href.startsWith('#')) return true
  return REMOTE_ROUTE_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`),
  )
}

/** Absolute URL for an un-ported marketing route. */
export function marketingUrl(path: string): string {
  return `${MARKETING_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
