// src/pages/MyClientsPage.tsx
// Page for managing user's clients (CRUD operations)

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // For a back button or other navigation
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import { db } from '../config/firebaseConfig'; // Adjust path
import { Client } from '../types'; // Adjust path, ensure Client type is defined

// Define the shape of the form data
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

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null); // Client being edited, or null for new
    const [formData, setFormData] = useState<ClientFormData>(initialFormData);
    const [isSaving, setIsSaving] = useState<boolean>(false);

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
            const q = query(clientsRef, orderBy('clientName', 'asc')); // Order by client name
            const querySnapshot = await getDocs(q);
            const fetchedClients = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as Client));
            setClients(fetchedClients);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
            if (editingClient) { // Update existing client
                const clientRef = doc(db, `users/${userId}/clients`, editingClient.id);
                await updateDoc(clientRef, clientDataPayload);
                alert("Client updated successfully!");
            } else { // Add new client
                const fullPayload = { ...clientDataPayload, createdAt: serverTimestamp() };
                await addDoc(collection(db, `users/${userId}/clients`), fullPayload);
                alert("Client added successfully!");
            }
            handleCloseModal();
            fetchClients(); // Refresh the list
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error("Error saving client:", err);
            setError("Failed to save client. " + err.message);
            alert("Failed to save client. " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!userId) return;
        if (!window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
            return;
        }
        try {
            await deleteDoc(doc(db, `users/${userId}/clients`, clientId));
            alert("Client deleted successfully.");
            fetchClients(); // Refresh list
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error("Error deleting client:", err);
            alert("Failed to delete client. " + err.message);
        }
    };

    if (isLoading) return <div style={pageStyles.container}><p>Loading clients...</p></div>;
    if (error) return <div style={pageStyles.container}><p style={{ color: 'red' }}>Error: {error}</p></div>;

    return (
        <div style={pageStyles.container}>
            <div style={pageStyles.header}>
                <h1 style={pageStyles.heading}>My Clients</h1>
                <button onClick={() => handleOpenModal()} style={pageStyles.addButton}>
                    + Add New Client
                </button>
            </div>

            {clients.length === 0 ? (
                <p>You haven't added any clients yet.</p>
            ) : (
                <table style={pageStyles.table}>
                    <thead style={pageStyles.thead}>
                        <tr>
                            <th style={pageStyles.th}>Client Name</th>
                            <th style={pageStyles.th}>Contact Person</th>
                            <th style={pageStyles.th}>Email</th>
                            <th style={pageStyles.th}>Phone</th>
                            <th style={pageStyles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id} style={pageStyles.tr}>
                                <td style={pageStyles.td}>{client.clientName}</td>
                                <td style={pageStyles.td}>{client.clientContactPerson || '-'}</td>
                                <td style={pageStyles.td}>{client.clientEmail || '-'}</td>
                                <td style={pageStyles.td}>{client.clientPhone || '-'}</td>
                                <td style={pageStyles.td}>
                                    <button onClick={() => handleOpenModal(client)} style={pageStyles.actionButton}>Edit</button>
                                    <button onClick={() => handleDeleteClient(client.id)} style={{...pageStyles.actionButton, ...pageStyles.deleteButton}}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Link to="/dashboard" style={{ marginTop: '30px', display: 'inline-block' }}>
                <button style={pageStyles.backButton}>Back to Dashboard</button>
            </Link>

            {/* Client Add/Edit Modal */}
            {isModalOpen && (
                <div style={modalStyles.overlay}>
                    <div style={modalStyles.modal}>
                        <h2 style={modalStyles.modalTitle}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
                        <form onSubmit={handleSubmitClient}>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="clientName" style={modalStyles.label}>Client Name*:</label>
                                <input type="text" name="clientName" id="clientName" value={formData.clientName} onChange={handleInputChange} required style={modalStyles.input} />
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="clientContactPerson" style={modalStyles.label}>Contact Person:</label>
                                <input type="text" name="clientContactPerson" id="clientContactPerson" value={formData.clientContactPerson} onChange={handleInputChange} style={modalStyles.input} />
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="clientEmail" style={modalStyles.label}>Email:</label>
                                <input type="email" name="clientEmail" id="clientEmail" value={formData.clientEmail} onChange={handleInputChange} style={modalStyles.input} />
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="clientPhone" style={modalStyles.label}>Phone:</label>
                                <input type="tel" name="clientPhone" id="clientPhone" value={formData.clientPhone} onChange={handleInputChange} style={modalStyles.input} />
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="clientAddress" style={modalStyles.label}>Address:</label>
                                <textarea name="clientAddress" id="clientAddress" value={formData.clientAddress} onChange={handleInputChange} rows={3} style={modalStyles.textarea}></textarea>
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="defaultClientTerms" style={modalStyles.label}>Default Terms for this Client:</label>
                                <textarea name="defaultClientTerms" id="defaultClientTerms" value={formData.defaultClientTerms} onChange={handleInputChange} rows={3} style={modalStyles.textarea}></textarea>
                            </div>
                            <div style={modalStyles.formGroup}>
                                <label htmlFor="clientNotes" style={modalStyles.label}>Internal Notes:</label>
                                <textarea name="clientNotes" id="clientNotes" value={formData.clientNotes} onChange={handleInputChange} rows={2} style={modalStyles.textarea}></textarea>
                            </div>
                            <div style={modalStyles.buttonGroup}>
                                <button type="submit" disabled={isSaving} style={modalStyles.saveButton}>
                                    {isSaving ? 'Saving...' : (editingClient ? 'Update Client' : 'Add Client')}
                                </button>
                                <button type="button" onClick={handleCloseModal} style={modalStyles.cancelButton} disabled={isSaving}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Basic Styles - Consider moving to CSS Modules later
const pageStyles: { [key: string]: React.CSSProperties } = {
    container: { padding: '2rem', maxWidth: '1000px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    heading: { color: '#333' },
    addButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    thead: { backgroundColor: '#f8f8f8' },
    th: { padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: '600' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '10px', verticalAlign: 'middle' },
    actionButton: { marginRight: '8px', padding: '6px 10px', fontSize: '0.9em', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white', borderColor: '#dc3545' },
    backButton: {padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}
};

const modalStyles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
    modalTitle: { marginTop: 0, marginBottom: '20px', color: '#333' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', color: '#444' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '70px' },
    buttonGroup: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    saveButton: { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    cancelButton: { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
};

export default MyClientsPage;
