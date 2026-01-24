'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import './Modal.css'

interface ModalProps {
    children: React.ReactNode
    onClose: () => void
}

export function Modal({ children, onClose }: ModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="modal-content"
            >
                {children}
            </motion.div>
        </motion.div>
    )
}

/**
 * CloseButton - Standard modal close button
 * Use this inside your modal content if needed, or import from specific form components
 */
export function CloseButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            aria-label="Close modal"
        >
            <X size={24} />
        </button>
    )
}
