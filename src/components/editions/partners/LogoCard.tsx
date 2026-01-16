import { motion } from 'framer-motion'
import { useState } from 'react'
import { PartnerEntity } from '@/data/partners'

interface LogoCardProps {
    entity: PartnerEntity
    isActive: boolean
    onClick: () => void
}

export const LogoCard: React.FC<LogoCardProps> = ({ entity, isActive, onClick }) => {
    return (
        <motion.div
            className={`logo-card ${isActive ? 'active' : ''}`}
            onClick={onClick}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            role="button"
            tabIndex={0}
            aria-expanded={isActive}
            aria-label={`View ${entity.name} Governing Body details`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onClick()
                }
            }}
        >
            <div className="logo-container">
                <img
                    src={entity.logo}
                    alt={`${entity.name} Logo`}
                    onError={(e) => {
                        // Fallback to placeholder if logo fails to load
                        e.currentTarget.src = '/images/partners/placeholder.svg'
                    }}
                />
            </div>

            <h3 className="entity-name">{entity.name}</h3>

            {/* Connector Line - The "Cognitive Bridge" */}
            <div className="connector-line" />
        </motion.div>
    )
}
