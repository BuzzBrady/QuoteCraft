// src/components/Step1_QuoteClientDetails.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '../types'; //
import styles from './QuoteBuilder.module.css'; //

interface Step1Props {
    jobTitle: string;
    setJobTitle: (value: string) => void;
    selectedClientId: string;
    setSelectedClientId: (value: string) => void;
    clients: Client[];
    isLoadingClients: boolean;
    validUntilDate: Date | null;
    setValidUntilDate: (date: Date | null) => void;

    // Add these props to receive client details from QuoteBuilder
    clientNameDisplay: string;
    clientAddressDisplay: string;
    clientEmailDisplay: string;
    clientPhoneDisplay: string;
}

const Step1_QuoteClientDetails: React.FC<Step1Props> = ({
    jobTitle, setJobTitle,
    selectedClientId, setSelectedClientId,
    clients, isLoadingClients,
    validUntilDate, setValidUntilDate,
    clientNameDisplay, clientAddressDisplay, clientEmailDisplay, clientPhoneDisplay, // Destructure new props
}) => {
    const navigate = useNavigate();

    const handleAddNewClient = () => {
        navigate('/my-clients'); // Navigates to the client management page
    };

    const handleEditClient = () => {
        if (selectedClientId) {
            // Option 1: Navigate to MyClientsPage, user finds the client.
            navigate('/my-clients');
            // Option 2 (More advanced): Navigate to a specific edit route or pass state
            // navigate(`/my-clients/edit/${selectedClientId}`); // Requires MyClientsPage to handle this
            // Or, even better (but more complex), open an edit modal here.
        }
    };

    return (
        <div className={styles.wizardStep}>
            <h3 className="mb-md">Job & Client Selection</h3>
            <div className={styles.headerSection}>
                <div className={styles.headerInputGroup}>
                    <label htmlFor="jobTitle">Job Title:*</label>
                    <input id="jobTitle" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
                </div>

                <div className={styles.headerInputGroup}>
                    <label htmlFor="clientSelector">Select Client:*</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                            id="clientSelector"
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            disabled={isLoadingClients}
                            required
                            style={{ flexGrow: 1 }}
                        >
                            <option value="">-- Select Existing Client --</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.clientName}{client.clientEmail ? ` (${client.clientEmail})` : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAddNewClient}
                            className="btn btn-secondary btn-sm"
                            title="Go to My Clients page to add a new client"
                        >
                            + Add New Client
                        </button>
                    </div>
                    {isLoadingClients && <small className="d-block mt-sm"> Loading clients...</small>}
                    {!selectedClientId && <p className="text-warning text-sm mt-sm">Client selection is required.</p>}
                </div>

                {/* Display Selected Client Details */}
                {selectedClientId && (
                    <div className={styles.selectedClientDetailsContainer}> {/* New container for styling */}
                        <div className={styles.clientDetailItem}><strong>Name:</strong> {clientNameDisplay || "N/A"}</div>
                        <div className={styles.clientDetailItem}><strong>Email:</strong> {clientEmailDisplay || "N/A"}</div>
                        <div className={styles.clientDetailItem}><strong>Phone:</strong> {clientPhoneDisplay || "N/A"}</div>
                        <div className={`${styles.clientDetailItem} ${styles.clientDetailAddress}`}><strong>Address:</strong> {clientAddressDisplay || "N/A"}</div>
                        <button
                            type="button"
                            onClick={handleEditClient}
                            className={`btn btn-outline-secondary btn-sm ${styles.editClientButton}`} // btn-outline-secondary or similar
                            title="Edit selected client details (opens My Clients page)"
                        >
                            Edit Client
                        </button>
                    </div>
                )}

                <div className={styles.headerInputGroup}>
                    <label htmlFor="validUntilDate">Quote Valid Until:</label>
                    <input
                        id="validUntilDate"
                        type="date"
                        value={validUntilDate ? validUntilDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setValidUntilDate(e.target.value ? new Date(e.target.value) : null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default Step1_QuoteClientDetails;