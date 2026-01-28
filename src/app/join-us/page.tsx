import { Metadata } from 'next'
import BuildWithUsSection from '@/components/sections/BuildWithUsSection'

export const metadata: Metadata = {
    title: 'Join Us | EKATVA',
    description: 'Three ways to be part of EKATVA. Partner as a student body, join the core team, or follow the movement. Unite IITM BS students across India.',
}

export default function JoinUsPage() {
    return (
        <main className="flex min-h-screen flex-col bg-oneness-black overflow-x-hidden selection:bg-ekatva-teal selection:text-oneness-black">
            <BuildWithUsSection />
        </main>
    )
}
