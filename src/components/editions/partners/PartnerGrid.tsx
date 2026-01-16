import React, { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PARTNER_ENTITIES } from '@/data/partners'
import { LogoCard } from './LogoCard'
import { DataTray } from './DataTray'

export const PartnerGrid: React.FC = () => {
    const [activeEntityId, setActiveEntityId] = useState<string | null>(null)

    const activeEntity = useMemo(
        () => PARTNER_ENTITIES.find(e => e.id === activeEntityId),
        [activeEntityId]
    )

    // Calculate where to inject the tray (after the row containing the active card)
    const trayIndex = useMemo(() => {
        if (!activeEntityId) return -1

        const currentIndex = PARTNER_ENTITIES.findIndex(e => e.id === activeEntityId)

        // Calculate items per row based on viewport
        // Desktop: 3 columns, Tablet: 2 columns, Mobile: 1 column
        // For now, defaulting to 3 (will be handled by CSS grid)
        const itemsPerRow = 3

        // Find the last item in the current row
        const rowEndIndex = Math.ceil((currentIndex + 1) / itemsPerRow) * itemsPerRow - 1

        return Math.min(rowEndIndex, PARTNER_ENTITIES.length - 1)
    }, [activeEntityId])

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
        const items: JSX.Element[] = []

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
