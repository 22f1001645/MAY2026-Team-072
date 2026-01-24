import type { Metadata } from 'next'
import { Poppins, Instrument_Serif } from 'next/font/google'
import { Navbar, Footer } from '@/components/layout'
import './globals.css'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'EKATVA - Unite. Inspire. Celebrate.',
  description: "India's first regional fest movement for IITM BS students. Connecting 34,000+ students across cities through celebration and community.",
  keywords: ['EKATVA', 'IIT Madras', 'IITM BS', 'regional fest', 'student community', 'India', 'Hyderabad'],
  authors: [{ name: 'EKATVA Team' }],
  openGraph: {
    title: 'EKATVA - Unite. Inspire. Celebrate.',
    description: "India's first regional fest movement for IITM BS students.",
    type: 'website',
    locale: 'en_IN',
    siteName: 'EKATVA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EKATVA - Unite. Inspire. Celebrate.',
    description: "India's first regional fest movement for IITM BS students.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${instrumentSerif.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.google.com" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}

