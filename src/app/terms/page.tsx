import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service - EKATVA',
  description: 'Terms of service for EKATVA - IIT Madras BS student initiative',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-oneness-black">
      <div className="container-custom py-24 md:py-32">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-ekatva-teal hover:text-accent-turquoise transition-colors duration-200 mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-light-gray">
            Last updated: January 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-4xl">
          <div className="bg-gradient-dark border border-divider-gray rounded-lg p-8 md:p-12">
            <p className="text-light-gray leading-relaxed mb-6">
              This is a placeholder for EKATVA's Terms of Service. The full terms will be published soon.
            </p>

            <p className="text-light-gray leading-relaxed mb-6">
              EKATVA is a student-led initiative of IIT Madras BS, dedicated to uniting, inspiring, and celebrating the IITM BS community across India.
            </p>

            <div className="mt-8 pt-8 border-t border-divider-gray">
              <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
              <p className="text-light-gray leading-relaxed">
                For any questions about these terms, please contact us at:{' '}
                <a
                  href="mailto:ekatva@iitm.ac.in"
                  className="text-ekatva-teal hover:text-accent-turquoise transition-colors duration-200"
                >
                  ekatva@iitm.ac.in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
