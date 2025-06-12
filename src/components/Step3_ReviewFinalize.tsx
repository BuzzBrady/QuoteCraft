// src/components/Step3_ReviewFinalize.tsx

import React from 'react';
import { useQuoteBuilderStore } from '../stores/useQuoteBuilderStore';
import { useUserProfile } from '../hooks/useUserProfile';
import QuoteLineItemDisplay from './QuoteLineItemDisplay';
import styles from './QuoteBuilder.module.css';


const Step3_ReviewFinalize = React.forwardRef<HTMLDivElement>((_props, ref) => {
    // Connect to the store to get the current quote state and update actions
    const { quote, updateQuoteHeader } = useQuoteBuilderStore();
    useUserProfile(); // For company details

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateQuoteHeader({ [e.target.name]: e.target.value });
    };

    return (
        <div ref={ref} className={styles.wizardStep}>
        <div className="wizardContent">
            <h3>Review & Finalize</h3>
            
            <div className="quote-preview">
                <h4>Quote For: {quote.clientName}</h4>
                <p><strong>Job:</strong> {quote.jobTitle}</p>
                <p><strong>Address:</strong> {quote.clientAddress}</p>
                <p><strong>Quote Number:</strong> {quote.quoteNumber}</p>
                
                <hr />

                <h4>Line Items</h4>
                <QuoteLineItemDisplay readOnly={true} />

                <hr />
                
                <h4>Terms & Notes</h4>
                <label>Project Description</label>
                <textarea 
                    name="projectDescription"
                    value={quote.projectDescription || ''}
                    onChange={handleTextChange}
                    rows={5}
                />
                <label>Additional Details / Exclusions</label>
                 <textarea 
                    name="additionalDetails"
                    value={quote.additionalDetails || ''}
                    onChange={handleTextChange}
                    rows={5}
                />
                <label>Terms & Conditions</label>
                <textarea 
                    name="terms"
                    value={quote.terms || ''}
                    onChange={handleTextChange}
                    rows={8}
                />
            </div>
        </div>
        </div>
    );
});

export default Step3_ReviewFinalize;