// src/pages/ExistingQuotesPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { Quote } from '../types';
import { formatCurrency, formatFirestoreTimestamp } from '../utils/utils';
import ExportQuoteModal from '../components/ExportQuoteModal'; 
import './ExistingQuotesPage.css';

const ExistingQuotesPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: quotes, isLoading, error } = useUserCollection<Quote>('quotes', 'updatedAt', 'desc');

    // 1. FIX: State to manage the modal and the selected quote
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    const handleEdit = (quoteId: string) => {
        navigate(`/quotes/edit/${quoteId}`);
    };
    
    // 2. FIX: Function to open the modal with the correct quote
    const handleOpenExportModal = (quote: Quote) => {
        setSelectedQuote(quote);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedQuote(null);
    };
    
    const QuoteRow = ({ quote }: { quote: Quote }) => (
        <div className="quote-row">
            <div className="quote-cell" data-label="Job Title">{quote.jobTitle}</div>
            <div className="quote-cell" data-label="Client">{quote.clientName || 'N/A'}</div>
            <div className="quote-cell" data-label="Updated">
                {formatFirestoreTimestamp(quote.updatedAt, 'short')}
            </div>
            <div className="quote-cell" data-label="Total">{formatCurrency(quote.totalAmount)}</div>
            <div className="quote-cell" data-label="Status">
                 <span className={`status-badge status-${quote.status?.toLowerCase()}`}>{quote.status}</span>
            </div>
            <div className="quote-cell quote-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(quote.id!)}>Edit</button>
                {/* 3. FIX: Trigger the modal with the specific quote */}
                <button className="btn btn-sm btn-primary" onClick={() => handleOpenExportModal(quote)}>Export PDF</button>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Existing Quotes</h1>
                <p>View, manage, and track the status of all your quotes.</p>
            </header>

            <div className="quote-list-container">
                <div className="quote-table">
                    <div className="quote-header">
                        <div className="quote-cell">Job Title</div>
                        <div className="quote-cell">Client</div>
                        <div className="quote-cell">Last Updated</div>
                        <div className="quote-cell">Total</div>
                        <div className="quote-cell">Status</div>
                        <div className="quote-cell">Actions</div>
                    </div>
                    {isLoading && <p>Loading quotes...</p>}
                    {error && <p className="error-message">Error: {error}</p>}
                    {!isLoading && quotes.length === 0 && (
                        <p className="no-data-message">You haven't created any quotes yet.</p>
                    )}
                    <div className="quote-body">
                        {quotes.map(quote => <QuoteRow key={quote.id} quote={quote} />)}
                    </div>
                </div>
            </div>
            
            {/* 4. FIX: Pass the selected quote to the modal */}
            <ExportQuoteModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                quote={selectedQuote}
            />
        </div>
    );
};

export default ExistingQuotesPage;
