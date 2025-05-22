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

    // Prevent clicks inside the modal from closing it
    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="generic-modal-title">
            <div className={styles.modalContent} onClick={handleContentClick}>
                <div className={styles.modalHeader}>
                    <h3 id="generic-modal-title" className={styles.modalTitle}>{title}</h3>
                    <button
                        onClick={onClose}
                        className={styles.closeButton}
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
