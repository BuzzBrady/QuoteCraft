// src/components/Step1_QuoteClientDetails.tsx

import React from 'react'; // FIX: Import React for forwardRef
import { useQuoteBuilderStore } from '../stores/useQuoteBuilderStore';
import { useUserCollection } from '../hooks/useUserCollection';
import { Client } from '../types';
import styles from './QuoteBuilder.module.css';

// FIX: Wrap the component in React.forwardRef
const Step1_QuoteClientDetails = React.forwardRef<HTMLDivElement>((_props, ref) => {
    const { quote, updateQuoteHeader } = useQuoteBuilderStore();
    const { data: clients, isLoading: clientsLoading } = useUserCollection<Client>('clients', 'clientName');

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        updateQuoteHeader({ [e.target.name]: e.target.value });
    };

    const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedClient = clients.find(c => c.id === e.target.value);
        if (selectedClient) {
            updateQuoteHeader({
                clientId: selectedClient.id,
                clientName: selectedClient.clientName,
                clientAddress: selectedClient.clientAddress,
            });
        } else {
             updateQuoteHeader({ clientId: '', clientName: '', clientAddress: '' });
        }
    };
    
    // FIX: Attach the forwarded ref to the root div
    return (
        <div ref={ref} className={styles.wizardStep}>
            <div className={styles.wizardContent}>
                            <h3>Client & Job Details</h3>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="jobTitle">Job Title</label>
                    <input id="jobTitle" type="text" name="jobTitle" value={quote.jobTitle || ''} onChange={handleFieldChange} />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="client-select">Select Existing Client</label>
                    <select id="client-select" onChange={handleClientSelect} value={quote.clientId || ''} disabled={clientsLoading}>
                        <option value="">-- New Client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                    </select>
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="clientName">Client Name</label>
                    <input id="clientName" type="text" name="clientName" value={quote.clientName || ''} onChange={handleFieldChange} />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="clientAddress">Client Address</label>
                    <textarea id="clientAddress" name="clientAddress" value={quote.clientAddress || ''} onChange={handleFieldChange}></textarea>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="clientEmail">Client Email</label>
                    <input id="clientEmail" type="email" name="clientEmail" value={quote.clientEmail || ''} onChange={handleFieldChange} />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="clientPhone">Client Phone</label>
                    <input id="clientPhone" type="tel" name="clientPhone" value={quote.clientPhone || ''} onChange={handleFieldChange} />
                </div>
            </div>
            </div>
        </div>
    );
});

export default Step1_QuoteClientDetails;