// src/components/ExportQuoteModal.tsx
import React from 'react';
import { QuoteExportLevel } from '../types';
import './ExportQuoteModal.css'; // Regular CSS import

interface ExportQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (exportLevel: QuoteExportLevel) => void;
    quoteNumber?: string;
    quoteId: string;
    isExporting: Record<string, boolean>;
}

const ExportQuoteModal: React.FC<ExportQuoteModalProps> = ({
    isOpen,
    onClose,
    onExport,
    quoteNumber,
    isExporting,
    quoteId,
}) => {
    if (!isOpen) {
        return null;
    }

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const createLoadingKey = (level: QuoteExportLevel) => `${quoteId}-${level}`;

    return (
        <div className="export-quote-modal-overlay modal-backdrop" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
            {/* Added global .modal-backdrop utility class to overlay */}
            <div className="export-quote-modal-content modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Added global .modal-content utility class */}
                <div className="export-quote-modal-header">
                    <h3 id="export-modal-title" className="text-primary">Export Quote: #{quoteNumber || 'N/A'}</h3> {/* Used text-primary utility */}
                    <button onClick={onClose} className="export-quote-modal-close-button" aria-label="Close modal">&times;</button>
                    {/* .export-quote-modal-close-button to be styled by ExportQuoteModal.css using vars */}
                </div>
                <div className="export-quote-modal-body">
                    <p className="mb-md">Choose the level of detail for your PDF export:</p> {/* Used margin utility */}
                    <button
                        onClick={() => onExport('summary')}
                        className="btn btn-primary w-100 mb-sm" /* Updated to global btn classes */
                        disabled={isExporting[createLoadingKey('summary')]}
                    >
                        {isExporting[createLoadingKey('summary')] ? 'Generating...' : 'Summary PDF'}
                    </button>
                    <button
                        onClick={() => onExport('standardDetail')}
                        className="btn btn-primary w-100 mb-sm" /* Updated to global btn classes */
                        disabled={isExporting[createLoadingKey('standardDetail')]}
                    >
                        {isExporting[createLoadingKey('standardDetail')] ? 'Generating...' : 'Standard Detail PDF'}
                    </button>
                    <button
                        onClick={() => onExport('fullDetail')}
                        className="btn btn-primary w-100" /* Updated to global btn classes */
                        disabled={isExporting[createLoadingKey('fullDetail')]}
                    >
                        {isExporting[createLoadingKey('fullDetail')] ? 'Generating...' : 'Full Detailed PDF'}
                    </button>
                </div>
                <div className="export-quote-modal-footer mt-lg"> {/* Used margin utility */}
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportQuoteModal;
