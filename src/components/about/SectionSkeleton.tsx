import React from 'react';

interface SectionSkeletonProps {
    className?: string;
}

export function SectionSkeleton({ className = '' }: SectionSkeletonProps) {
    return (
        <div
            className={`w-full min-h-screen flex flex-col items-center justify-center p-8 bg-oneness-black/50 ${className}`}
            role="status"
            aria-label="Loading section content"
        >
            <div className="w-full max-w-7xl mx-auto space-y-12 animate-pulse">
                {/* Header Skeleton */}
                <div className="w-full flex flex-col items-center space-y-4">
                    <div className="h-8 bg-ekatva-teal/10 rounded w-48" />
                    <div className="h-16 bg-white/5 rounded w-3/4 max-w-2xl" />
                </div>

                {/* Content Grid Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-12">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-white/5 rounded-xl w-full" />
                        ))}
                    </div>

                    {/* Right Column */}
                    <div className="hidden lg:block h-full min-h-[400px] bg-white/5 rounded-xl" />
                </div>
            </div>
            <span className="sr-only">Loading section...</span>
        </div>
    );
}
