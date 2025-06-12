// src/pages/UserRateTemplatesPage.tsx

import React, { useState } from 'react';
import { useUserCollection } from '../hooks/useUserCollection'; // 1. Import our custom hook
import { UserRateTemplate } from '../types';
import RateTemplateFormModal from '../components/RateTemplateFormModal';
import styles from './UserRateTemplatesPage.module.css';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const UserRateTemplatesPage: React.FC = () => {
    const { currentUser } = useAuth();
    
    // 2. Fetch rate templates with a single line using our hook
    const { 
        data: rateTemplates, 
        isLoading, 
        error, 
        refetch 
    } = useUserCollection<UserRateTemplate>('rateTemplates', 'displayName_lowercase');

    // State for managing the modal remains the same
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<UserRateTemplate | null>(null);

    // NOTE: The useEffects for fetching tasks and materials are now removed.

    const handleOpenModal = (template: UserRateTemplate | null = null) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingTemplate(null);
        setIsModalOpen(false);
    };

    const handleSave = async (rateData: Omit<UserRateTemplate, 'id' | 'userId'>) => {
        if (!currentUser) {
            console.error("No user logged in.");
            return;
        }
        
        try {
            if (editingTemplate) {
                // Update existing template
                const templateRef = doc(db, 'users', currentUser.uid, 'rateTemplates', editingTemplate.id);
                await updateDoc(templateRef, { ...rateData, updatedAt: serverTimestamp() });
            } else {
                // Add new template
                const collectionRef = collection(db, 'users', currentUser.uid, 'rateTemplates');
                await addDoc(collectionRef, { ...rateData, userId: currentUser.uid, createdAt: serverTimestamp() });
            }
            refetch(); // 3. Simply call refetch() to update the list
            handleCloseModal();
        } catch (error) {
            console.error("Error saving rate template: ", error);
        }
    };

    const handleDelete = async (templateId: string) => {
        if (!currentUser || !window.confirm("Are you sure you want to delete this rate template?")) {
            return;
        }
        try {
            const templateRef = doc(db, 'users', currentUser.uid, 'rateTemplates', templateId);
            await deleteDoc(templateRef);
            refetch(); // 4. Simply call refetch() to update the list
        } catch (error) {
            console.error("Error deleting rate template: ", error);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>My Rate Templates</h1>
                <button onClick={() => handleOpenModal()} className="button-primary">
                    Add New Rate
                </button>
            </header>
            
            <p className={styles.description}>
                Create predefined rates for specific tasks or materials to speed up your quoting process.
            </p>

            {isLoading && <p>Loading rates...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            <div className={styles.ratesList}>
                {rateTemplates.map(template => (
                    <div key={template.id} className={styles.rateCard}>
                        <div className={styles.rateInfo}>
                            <span className={styles.displayName}>{template.displayName}</span>
                            <span className={styles.rateValue}>${template.referenceRate.toFixed(2)} / {template.unit}</span>
                        </div>
                        <div className={styles.actions}>
                            <button onClick={() => handleOpenModal(template)}>Edit</button>
                            <button onClick={() => handleDelete(template.id)} className={styles.deleteButton}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <RateTemplateFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                initialData={editingTemplate}
                mode={editingTemplate ? 'edit' : 'add'}
                // 5. No longer need to pass allTasks or allMaterials
            />
        </div>
    );
};

export default UserRateTemplatesPage;