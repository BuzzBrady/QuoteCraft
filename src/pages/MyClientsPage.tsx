// src/pages/MyClientsPage.tsx

import React, { useState } from 'react';
import { Client } from '../types';
import { useUserCollection } from '../hooks/useUserCollection';
import styles from './MyClientsPage.module.css';

// TODO: A ClientFormModal component is needed to add/edit clients.

const MyClientsPage: React.FC = () => {
    const { data: clients, isLoading, error, refetch } = useUserCollection<Client>('clients', 'clientName');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const handleOpenModal = (client: Client | null = null) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        refetch();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>My Clients</h1>
                <button onClick={() => handleOpenModal()} className="button-primary">
                    Add New Client
                </button>
            </header>

            {isLoading && <p>Loading clients...</p>}
            {error && <p className="error-message">Error: {error}</p>}
            
            {!isLoading && !error && (
                <div className={styles.clientList}>
                    {clients.map(client => (
                        <div key={client.id} className={styles.clientCard}>
                            <h3>{client.clientName}</h3>
                            <p>{client.clientEmail}</p>
                            <p>{client.clientPhone}</p>
                            <button onClick={() => handleOpenModal(client)}>Edit</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyClientsPage;
