// src/pages/MyClientsPage.tsx
import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, writeBatch, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import { Client } from '../types';
import styles from './MyClientsPage.module.css'; // Import the CSS Module
import Papa from 'papaparse'; // For CSV Parsing

// Define the shape of the form data for the modal
interface ClientFormData {
    clientName: string;
    clientContactPerson?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    clientNotes?: string;
    defaultClientTerms?: string;
}

const initialFormData: ClientFormData = {
    clientName: '',
    clientContactPerson: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    clientNotes: '',
    defaultClientTerms: '',
};

function MyClientsPage() {
    const { currentUser } = useAuth();
    const userId = currentUser?.uid;

    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState<ClientFormData>(initialFormData);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Ref for the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to lock body scroll when modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalOverflow;
        }
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isModalOpen]);

    const fetchClients = useCallback(async () => {
        if (!userId) {
            setClients([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const clientsRef = collection(db, `users/${userId}/clients`);
            const q = query(clientsRef, orderBy('clientName', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedClients = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as Client));
            setClients(fetchedClients);
        } catch (err: any) {
            console.error("Error fetching clients:", err);
            setError("Failed to load clients. " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenModal = (clientToEdit: Client | null = null) => {
        if (clientToEdit) {
            setEditingClient(clientToEdit);
            setFormData({
                clientName: clientToEdit.clientName || '',
                clientContactPerson: clientToEdit.clientContactPerson || '',
                clientEmail: clientToEdit.clientEmail || '',
                clientPhone: clientToEdit.clientPhone || '',
                clientAddress: clientToEdit.clientAddress || '',
                clientNotes: clientToEdit.clientNotes || '',
                defaultClientTerms: clientToEdit.defaultClientTerms || '',
            });
        } else {
            setEditingClient(null);
            setFormData(initialFormData);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData(initialFormData);
    };

    const handleSubmitClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            alert("Error: Not logged in.");
            return;
        }
        if (!formData.clientName.trim()) {
            alert("Client Name is required.");
            return;
        }
        setIsSaving(true);
        setError(null);

        const clientDataPayload = {
            userId: userId,
            clientName: formData.clientName.trim(),
            clientContactPerson: formData.clientContactPerson?.trim() || undefined,
            clientEmail: formData.clientEmail?.trim() || undefined,
            clientPhone: formData.clientPhone?.trim() || undefined,
            clientAddress: formData.clientAddress?.trim() || undefined,
            clientNotes: formData.clientNotes?.trim() || undefined,
            defaultClientTerms: formData.defaultClientTerms?.trim() || undefined,
            updatedAt: serverTimestamp(),
        };

        try {
            if (editingClient) {
                const clientRef = doc(db, `users/${userId}/clients`, editingClient.id);
                await updateDoc(clientRef, clientDataPayload);
            } else {
                const fullPayload = { ...clientDataPayload, createdAt: serverTimestamp() };
                await addDoc(collection(db, `users/${userId}/clients`), fullPayload);
            }
            handleCloseModal();
            fetchClients(); // Refresh the list
        } catch (err: any) {
            console.error("Error saving client:", err);
            setError("Failed to save client. " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!userId || !window.confirm("Are you sure you want to delete this client?")) return;
        try {
            await deleteDoc(doc(db, `users/${userId}/clients`, clientId));
            fetchClients();
        } catch (err: any) {
            console.error("Error deleting client:", err);
            setError("Failed to delete client. " + err.message);
        }
    };

    // --- Functions for Client Import ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        console.log("Starting to parse file:", file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ",",
            
            // --- ADD THIS BLOCK FOR DEBUGGING ---
            transformHeader: (header) => {
                console.log(`[Papaparse Header Debug] Saw header: "${header}"`);
                return header.trim(); // Also good practice to trim whitespace
            },
            // ------------------------------------

            complete: (results) => {
                // Check for parsing errors reported by papaparse
                if (results.errors.length > 0) {
                    console.error("CSV parsing errors occurred:", results.errors);
                    const errorSummary = results.errors.map(err => `Error on row ${err.row}: ${err.message}`).join('\n');
                    setError(`Could not parse CSV file. Please check its format.\nDetails:\n${errorSummary}`);
                    alert(`Could not parse CSV file. Please check console for details.`);
                    return;
                }

                console.log("Parsed CSV data:", results.data);
                handleImportClients(results.data);
            },
            error: (error: any) => {
                console.error("A critical error occurred during parsing:", error);
                setError("Failed to parse CSV file due to a critical error.");
                alert("A critical error occurred while parsing the file.");
            }
        });

        // Reset file input
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleImportClients = async (parsedClients: any[]) => {
        if (!userId) return setError("You must be logged in to import.");
        if (!parsedClients || parsedClients.length === 0) return alert("No valid client data found in the file.");
        if (!window.confirm(`Found ${parsedClients.length} clients. Do you want to import them?`)) return;

        setIsLoading(true);
        const clientsRef = collection(db, `users/${userId}/clients`);
        const batch = writeBatch(db);
        let importCount = 0;

        for (const client of parsedClients) {
            const clientName = client['Client Name'] || client['Company'];
            if (!clientName || !clientName.trim()) continue;

            const newClientDocRef = doc(clientsRef);
            batch.set(newClientDocRef, {
                userId: userId,
                clientName: clientName.trim(),
                clientContactPerson: client['Contact Person']?.trim() || '',
                clientEmail: client['Email']?.trim() || '',
                clientPhone: client['Phone']?.trim() || '',
                clientAddress: client['Address']?.trim() || '',
                defaultClientTerms: client['Default Client Terms']?.trim() || '',
                clientNotes: client['Internal Notes']?.trim() || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            importCount++;
        }

        if (importCount === 0) {
            alert("No clients with a valid name were found to import.");
            setIsLoading(false);
            return;
        }

        try {
            await batch.commit();
            alert(`${importCount} clients imported successfully!`);
            fetchClients();
        } catch (err: any) {
            console.error("Error importing clients:", err);
            setError("An error occurred during the import process.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTriggerImport = () => {
        fileInputRef.current?.click();
    };

    if (!currentUser) return <div className={styles.pageContainer}><p className="text-warning">Please log in to manage your clients.</p></div>;
    if (isLoading) return <div className={styles.pageContainer}><p className={styles.loadingText}>Loading clients...</p></div>;
    if (error) return <div className={styles.pageContainer}><p className={styles.errorText}>Error: {error}</p></div>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>My Clients</h1>
                <div className={styles.headerActions}>
                    <button onClick={handleTriggerImport} className="btn btn-secondary" disabled={isLoading}>
                        Import Clients
                    </button>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary" disabled={isLoading}>
                        + Add New Client
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleFileChange}
            />

            {clients.length === 0 ? (
                <p>You haven't added any clients yet.</p>
            ) : (
                <ul className={styles.clientList}>
                    {clients.map(client => (
                        <li key={client.id} className={styles.clientItem}>
                            <div className={styles.clientDetails}>
                                <strong>{client.clientName}</strong>
                                <span>{client.clientContactPerson || 'No contact person'}</span>
                                <span>{client.clientEmail || 'No email'}</span>
                                <span>{client.clientPhone || 'No phone'}</span>
                            </div>
                            <div className={styles.clientActions}>
                                <button onClick={() => handleOpenModal(client)} className="btn btn-secondary btn-sm">Edit</button>
                                <button onClick={() => handleDeleteClient(client.id)} className="btn btn-danger btn-sm">Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Link to="/dashboard" style={{ marginTop: '30px', display: 'inline-block' }}>
                <button className="btn btn-secondary">Back to Dashboard</button>
            </Link>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                             <h2 className={styles.modalTitle}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
                        </div>
                        <div className={styles.modalBody}>
                             <form onSubmit={handleSubmitClient} id="client-form" className={styles.formContainer}>
                                <div className="form-group">
                                    <label htmlFor="clientName">Client Name*:</label>
                                    <input type="text" name="clientName" id="clientName" value={formData.clientName} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clientContactPerson">Contact Person:</label>
                                    <input type="text" name="clientContactPerson" id="clientContactPerson" value={formData.clientContactPerson} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clientEmail">Email:</label>
                                    <input type="email" name="clientEmail" id="clientEmail" value={formData.clientEmail} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clientPhone">Phone:</label>
                                    <input type="tel" name="clientPhone" id="clientPhone" value={formData.clientPhone} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clientAddress">Address:</label>
                                    <textarea name="clientAddress" id="clientAddress" value={formData.clientAddress} onChange={handleInputChange} rows={3}></textarea>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="defaultClientTerms">Default Terms for this Client:</label>
                                    <textarea name="defaultClientTerms" id="defaultClientTerms" value={formData.defaultClientTerms} onChange={handleInputChange} rows={3}></textarea>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clientNotes">Internal Notes:</label>
                                    <textarea name="clientNotes" id="clientNotes" value={formData.clientNotes} onChange={handleInputChange} rows={2}></textarea>
                                </div>
                            </form>
                        </div>
                        <div className={styles.modalFooter}>
                            <button type="button" onClick={handleCloseModal} className="btn btn-secondary" disabled={isSaving}>Cancel</button>
                            <button type="submit" form="client-form" disabled={isSaving} className="btn btn-accent">
                                {isSaving ? 'Saving...' : (editingClient ? 'Update Client' : 'Add Client')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyClientsPage;