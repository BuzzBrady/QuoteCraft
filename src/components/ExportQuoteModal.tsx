// src/components/ExportQuoteModal.tsx
import React from 'react';
import { QuoteExportLevel } from '../types'; // Adjust path if your types.ts is elsewhere
import './ExportQuoteModal.css';

// ---- THIS IS THE INTERFACE TO UPDATE ----
interface ExportQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (exportLevel: QuoteExportLevel) => void;
    quoteNumber?: string; // Make sure this is optional if it might not always be passed
    quoteId: string;      // Add this if it's missing
    isExporting: Record<string, boolean>; // Add this if it's missing
}
// ---- END OF INTERFACE UPDATE ----

const ExportQuoteModal: React.FC<ExportQuoteModalProps> = ({
    isOpen,
    onClose,
    onExport,
    quoteNumber, // Now this prop is recognized
    isExporting, // And this one
    quoteId,     // And this one
}) => {
    if (!isOpen) {
        return null;
    }

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Helper to create a unique key for the isExporting state
    const createLoadingKey = (level: QuoteExportLevel) => `${quoteId}-${level}`;

    return (
        <div className="export-quote-modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
            <div className="export-quote-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="export-quote-modal-header">
                    <h3 id="export-modal-title">Export Quote: #{quoteNumber || 'N/A'}</h3>
                    <button onClick={onClose} className="export-quote-modal-close-button" aria-label="Close modal">&times;</button>
                </div>
                <div className="export-quote-modal-body">
                    <p>Choose the level of detail for your PDF export:</p>
                    <button
                        onClick={() => onExport('summary')}
                        className="export-quote-modal-option-button"
                        disabled={isExporting[createLoadingKey('summary')]}
                    >
                        {isExporting[createLoadingKey('summary')] ? 'Generating...' : 'Summary PDF'}
                    </button>
                    <button
                        onClick={() => onExport('standardDetail')}
                        className="export-quote-modal-option-button"
                        disabled={isExporting[createLoadingKey('standardDetail')]}
                    >
                        {isExporting[createLoadingKey('standardDetail')] ? 'Generating...' : 'Standard Detail PDF'}
                    </button>
                    <button
                        onClick={() => onExport('fullDetail')}
                        className="export-quote-modal-option-button"
                        disabled={isExporting[createLoadingKey('fullDetail')]}
                    >
                        {isExporting[createLoadingKey('fullDetail')] ? 'Generating...' : 'Full Detailed PDF'}
                    </button>
                </div>
                <div className="export-quote-modal-footer">
                    <button onClick={onClose} className="export-quote-modal-option-button cancel">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportQuoteModal;