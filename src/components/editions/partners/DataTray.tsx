import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
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
            animate={{ opacity: 1, maxHeight: 600, margin: '30px 0' }}
            exit={{ opacity: 0, maxHeight: 0, margin: '0' }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            role="region"
            aria-live="polite"
            aria-label={`${entity.name} Governing Body details`}
        >
            {/* Tray Header */}
            <div className="tray-header">
                <div className="tray-logo">
                    <img src={entity.logo} alt={`${entity.name} Logo`} />
                </div>

                <h3 className="tray-title">{entity.name}</h3>

                <button
                    className="tray-close"
                    onClick={onClose}
                    aria-label="Close details"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Tray Content */}
            <div className="tray-content">
                <p className="gb-section-header">Governing Body</p>

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

                            <div className="role-icon">
                                {member.role === 'Secretary' && '👔'}
                                {member.role === 'Deputy Secretary' && '🎯'}
                                {member.role === 'Web Admin' && '💻'}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </motion.div>
    )
}
