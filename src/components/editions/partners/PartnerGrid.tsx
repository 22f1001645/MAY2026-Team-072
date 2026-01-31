import React, { useState, useMemo, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PARTNER_ENTITIES } from '@/data/partners'
import { LogoCard } from './LogoCard'
import { DataTray } from './DataTray'

export const PartnerGrid: React.FC = () => {
    const [activeEntityId, setActiveEntityId] = useState<string | null>('pravaha') // Default to Pravāha
    const [windowWidth, setWindowWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 1920
    )

    // Listen to window resize for responsive tray positioning
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const activeEntity = useMemo(
        () => PARTNER_ENTITIES.find(e => e.id === activeEntityId),
        [activeEntityId]
    )

    // Calculate where to inject the tray
    // Desktop: after the row containing the active card
    // Mobile (≤768px): immediately after the active card (inline expansion)
    const trayIndex = useMemo(() => {
        if (!activeEntityId) return -1

        const currentIndex = PARTNER_ENTITIES.findIndex(e => e.id === activeEntityId)

        // Detect mobile viewport (≤768px) - inline expansion
        const isMobile = windowWidth <= 768

        if (isMobile) {
            // Mobile: inject tray immediately after selected item
            return currentIndex
        }

        // Desktop: Calculate items per row and inject at row-end
        // Desktop: 5 columns (compact grid)
        // Tablet: 4 columns
        // Mobile grid fallback: 3 columns (shouldn't reach here due to isMobile check)
        const itemsPerRow = 5

        // Find the last item in the current row
        const rowEndIndex = Math.ceil((currentIndex + 1) / itemsPerRow) * itemsPerRow - 1

        return Math.min(rowEndIndex, PARTNER_ENTITIES.length - 1)
    }, [activeEntityId, windowWidth])

    const handleToggleEntity = (entityId: string) => {
        if (activeEntityId === entityId) {
            setActiveEntityId(null) // Close if clicking the same card
        } else {
            setActiveEntityId(entityId) // Open different card
        }
    }

    const handleCloseTray = () => {
        setActiveEntityId(null)
    }

    // Build the grid array with the tray injected at the correct position
    const gridItems = useMemo(() => {
        const items: React.JSX.Element[] = []

        PARTNER_ENTITIES.forEach((entity, index) => {
            // Add the logo card
            items.push(
                <LogoCard
                    key={entity.id}
                    entity={entity}
                    isActive={activeEntityId === entity.id}
                    onClick={() => handleToggleEntity(entity.id)}
                />
            )

            // If this is the tray injection point, add the tray
            if (index === trayIndex && activeEntity) {
                items.push(
                    <AnimatePresence key="tray">
                        <DataTray entity={activeEntity} onClose={handleCloseTray} />
                    </AnimatePresence>
                )
            }
        })

        return items
    }, [activeEntityId, trayIndex, activeEntity])

    return (
        <section className="partner-communities">
            {/* Section Header */}
            <header className="section-header">
                <h2 className="section-title">Partner Communities</h2>
                <p className="section-subtitle">
                    Governing Body <span className="separator">•</span> Hyderabad Edition 2024-2025
                </p>
                <div className="section-divider" />
            </header>

            {/* Logo Grid */}
            <div className="entities-grid">
                {gridItems}
            </div>
        </section>
    )
}
