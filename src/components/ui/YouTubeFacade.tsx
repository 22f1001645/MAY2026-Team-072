'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface YouTubeFacadeProps {
    videoId: string
    posterUrl?: string
    className?: string
}

export function YouTubeFacade({ videoId, posterUrl, className }: YouTubeFacadeProps) {
    const [isPlaying, setIsPlaying] = useState(false)

    // Construct the high-res thumbnail URL if not provided manually
    const thumbnailUrl = posterUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

    return (
        <div
            className={cn(
                "relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_rgba(92,230,201,0.15)] border border-teal-500/30 group",
                className
            )}
        >
            <AnimatePresence mode='wait'>
                {!isPlaying ? (
                    /* STATE A: THE FACADE (Image + Play Button) */
                    <motion.div
                        key="facade"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => setIsPlaying(true)}
                    >
                        {/* 1. Background Blur Layer (Ambilight Effect) */}
                        <div className="absolute inset-0 overflow-hidden">
                            <img
                                src={thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover blur-2xl opacity-60 scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40" /> {/* Dimming Overlay */}
                        </div>

                        {/* 2. The Sharp Cover Image */}
                        <img
                            src={thumbnailUrl}
                            alt="Aftermovie Cover"
                            className="relative z-10 w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                            loading="eager"
                        />

                        {/* 3. The Custom Play Button */}
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-20 h-20 md:w-24 md:h-24 bg-teal-400/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(92,230,201,0.6)]"
                            >
                                <Play className="w-8 h-8 md:w-10 md:h-10 text-black fill-current ml-1" />
                            </motion.div>

                        </div>
                    </motion.div>
                ) : (
                    /* STATE B: THE PLAYER (Injects Only On Click) */
                    <motion.div
                        key="player"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full h-full bg-black"
                    >
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&showinfo=0&color=white`}
                            title="Ekatva Aftermovie"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
