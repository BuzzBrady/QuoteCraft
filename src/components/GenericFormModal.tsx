// src/components/GenericFormModal.tsx
import React from 'react';
import styles from './GenericFormModal.module.css';

interface GenericFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footerContent?: React.ReactNode;
}

function GenericFormModal({
    isOpen,
    onClose,
    title,
    children,
    footerContent,
}: GenericFormModalProps) {
    if (!isOpen) {
        return null;
    }

    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    return (
        // Use global .modal-backdrop for the overlay
        <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="generic-modal-title">
            {/* Use global .modal-content for the main modal structure */}
            <div className="modal-content" onClick={handleContentClick}>
                {/* Retain module styles for internal structure if they are more specific */}
                <div className={styles.modalHeader}>
                    <h3 id="generic-modal-title" className={styles.modalTitle}>{title}</h3>
                    <button
                        onClick={onClose}
                        className={styles.closeButton} // Keep using module style for close button for now
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {children}
                </div>
                {footerContent && (
                    <div className={styles.modalFooter}>
                        {footerContent}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GenericFormModal;
