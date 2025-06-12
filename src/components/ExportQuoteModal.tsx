// src/components/ExportQuoteModal.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Quote, QuoteExportLevel } from '../types';

// 1. FIX: Update the props interface to accept a quote object
interface ExportQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    quote: Quote | null; // The specific quote to be exported
}

const ExportQuoteModal: React.FC<ExportQuoteModalProps> = ({ isOpen, onClose, quote }) => {
    // This component no longer needs useUserProfile or useQuoteBuilderStore
    
    const [exportLevel, setExportLevel] = useState<QuoteExportLevel>('standardDetail');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsSending(false);
            setError(null);
        }
    }, [isOpen]);

    const handleExport = async (e: FormEvent) => {
        e.preventDefault();
        
        // 2. FIX: Use the quote object from props
        if (!quote || !quote.id || !quote.userId) {
            setError("A valid quote was not provided to the export modal.");
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const functions = getFunctions();
            const generateQuotePdf = httpsCallable(functions, 'generateQuotePdf');
            
            const result = await generateQuotePdf({ 
                quoteId: quote.id,
                userId: quote.userId,
                exportLevel: exportLevel 
            });

            const data = result.data as { url: string };
            if (data.url) {
                window.open(data.url, '_blank');
                onClose();
            } else {
                throw new Error("PDF URL was not returned from the function.");
            }
        } catch (err: any) {
            console.error("Error exporting PDF:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Export Quote #{quote?.quoteNumber}</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </header>
                <form onSubmit={handleExport}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="exportLevel">Detail Level</label>
                            <select 
                                id="exportLevel"
                                value={exportLevel} 
                                onChange={(e) => setExportLevel(e.target.value as QuoteExportLevel)}
                            >
                                <option value="summary">Summary Only</option>
                                <option value="standardDetail">Standard Detail</option>
                                <option value="fullDetail">Full Detail</option>
                            </select>
                        </div>
                        {error && <p className="error-message">{error}</p>}
                    </div>
                    <footer className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSending}>
                            {isSending ? 'Generating...' : 'Generate & View PDF'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ExportQuoteModal;
