import { motion } from 'framer-motion'
import { X, Diamond } from 'lucide-react'
import { PartnerEntity } from '@/data/partners'

interface DataTrayProps {
    entity: PartnerEntity
    onClose: () => void
}

export const DataTray: React.FC<DataTrayProps> = ({ entity, onClose }) => {
    return (
        <motion.div
            className="data-tray"
            initial={{ opacity: 0, maxHeight: 0, margin: '0' }}
            animate={{ opacity: 1, maxHeight: 600, margin: '8px 0' }}
            exit={{ opacity: 0, maxHeight: 0, margin: '0' }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            role="region"
            aria-live="polite"
            aria-label={`GB Representatives from ${entity.name}`}
        >
            {/* Tray Header - Two-Line Title, No Logo */}
            <div className="tray-header">
                <div className="tray-titles">
                    <h3 className="tray-title-main">GB Representatives from {entity.name}</h3>
                    <p className="tray-title-sub">2024-2025 Edition</p>
                </div>
                <button
                    className="tray-close"
                    onClick={onClose}
                    aria-label="Close details"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Tray Content - Members Grid */}
            <div className="tray-content">
                <motion.div
                    className="gb-members-grid"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: {
                            transition: {
                                staggerChildren: 0.05,
                                delayChildren: 0.1
                            }
                        }
                    }}
                >
                    {entity.gbMembers.map((member, index) => (
                        <motion.div
                            key={`${member.name}-${index}`}
                            className="gb-member-card"
                            variants={{
                                hidden: { opacity: 0, y: -15 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            transition={{ duration: 0.35 }}
                            whileHover={{ x: 6 }}
                        >
                            <div className="member-info">
                                <div className="member-name">{member.name}</div>
                                <div className="member-role">{member.role}</div>
                            </div>

                            {/* Diamond Icon - Flat Hierarchy (same for all roles) */}
                            <div className="role-icon">
                                <Diamond size={18} />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </motion.div>
    )
}
