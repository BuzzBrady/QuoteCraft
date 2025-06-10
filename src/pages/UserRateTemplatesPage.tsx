// src/pages/UserRateTemplatesPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import { UserRateTemplate, CombinedTask, CombinedMaterial } from '../types';
import styles from './UserRateTemplatesPage.module.css';
import RateTemplateFormModal from '../components/RateTemplateFormModal';

// This interface helps us display the names associated with the IDs stored in the rate template
interface DisplayRate extends UserRateTemplate {
    taskName?: string;
    materialName?: string;
    materialOptionName?: string;
}

function UserRateTemplatesPage() {
    const { currentUser } = useAuth();
    const userId = currentUser?.uid;

    const [displayRates, setDisplayRates] = useState<DisplayRate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentRate, setCurrentRate] = useState<UserRateTemplate | null>(null);

    // State to hold all tasks and materials to pass to the modal
    const [allTasks, setAllTasks] = useState<CombinedTask[]>([]);
    const [allMaterials, setAllMaterials] = useState<CombinedMaterial[]>([]);

    const fetchAllData = useCallback(async () => {
        if (!userId) {
            setDisplayRates([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const ratesRef = collection(db, `users/${userId}/rateTemplates`);
            const tasksRef = collection(db, 'tasks');
            const customTasksRef = collection(db, `users/${userId}/customTasks`);
            const materialsRef = collection(db, 'materials');
            const customMaterialsRef = collection(db, `users/${userId}/customMaterials`);

            const [ ratesSnapshot, tasksSnapshot, customTasksSnapshot, materialsSnapshot, customMaterialsSnapshot ] = await Promise.all([
                getDocs(query(ratesRef, orderBy('displayName_lowercase', 'asc'))),
                getDocs(query(tasksRef)), getDocs(query(customTasksRef)),
                getDocs(query(materialsRef)), getDocs(query(customMaterialsRef)),
            ]);

            const rates = ratesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRateTemplate));
            const tasks = [...tasksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as CombinedTask), ...customTasksSnapshot.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true }) as CombinedTask)];
            const materials = [...materialsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as CombinedMaterial), ...customMaterialsSnapshot.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true }) as CombinedMaterial)];
            
            // Set tasks and materials state to pass to the modal
            setAllTasks(tasks.sort((a,b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())));
            setAllMaterials(materials.sort((a,b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())));

            const tasksMap = new Map(tasks.map(task => [task.id, task.name]));
            const materialsMap = new Map(materials.map(mat => [mat.id, mat.name]));
            
            const combinedRates: DisplayRate[] = rates.map(rate => ({
                ...rate,
                taskName: rate.taskId ? tasksMap.get(rate.taskId) : undefined,
                materialName: rate.materialId ? materialsMap.get(rate.materialId) : undefined,
                // The 'materialOptionName' should already be on the rate template object when it's saved
            }));
            setDisplayRates(combinedRates);
        } catch (err: any) {
            console.error("Error fetching page data:", err);
            setError("Failed to load rate templates and associated data. " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleOpenAddModal = () => {
        setModalMode('add');
        setCurrentRate(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (rate: UserRateTemplate) => {
        setModalMode('edit');
        setCurrentRate(rate);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentRate(null);
    };
    
    // RENAMED from handleSave to handleSaveRate and made ASYNC
    const handleSaveRate = async (rateData: any) => {
        if (!userId) {
            setError("You must be logged in to save.");
            return;
        }
        setIsLoading(true); // Set loading for the page while saving
        try {
            const ratesCollectionRef = collection(db, `users/${userId}/rateTemplates`);
            if (modalMode === 'add') {
                await addDoc(ratesCollectionRef, {
                    ...rateData,
                    userId: userId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } else if (currentRate?.id) {
                const rateDocRef = doc(db, `users/${userId}/rateTemplates`, currentRate.id);
                await updateDoc(rateDocRef, {
                    ...rateData,
                    updatedAt: serverTimestamp(),
                });
            }
            await fetchAllData(); // Refresh the list with the latest data
        } catch (err: any) {
            console.error("Error saving rate template:", err);
            setError(`Failed to save rate template: ${err.message}`);
        } finally {
            setIsLoading(false);
            handleCloseModal(); // Close the modal regardless of success or failure
        }
    };

    const handleDeleteRate = async (rateId: string) => {
        if (!userId || !window.confirm("Are you sure you want to delete this rate template?")) return;
        
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, `users/${userId}/rateTemplates`, rateId));
            await fetchAllData(); // Refetch to update the list
        } catch (err: any) {
            console.error("Error deleting rate template:", err);
            setError(`Failed to delete rate: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return <div className={styles.pageContainer}><p className="text-warning">Please log in to manage your rate templates.</p></div>;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>My Rate Templates</h1>
                <button onClick={handleOpenAddModal} className="btn btn-primary" disabled={isLoading}>
                    + Add New Rate Template
                </button>
            </div>

            <div className={styles.contentArea}>
                {isLoading && <p className={styles.loadingText}>Loading your rate templates...</p>}
                {error && <p className={styles.errorText}>{error}</p>}

                {!isLoading && !error && displayRates.length === 0 && (
                    <p>You haven't created any rate templates yet. Create templates to pre-define costs for specific task/material combinations.</p>
                )}

                {!isLoading && !error && displayRates.length > 0 && (
                    <ul className={styles.rateList}>
                        {displayRates.map(rate => (
                            <li key={rate.id} className={styles.rateItem}>
                                <div className={styles.rateDetails}>
                                    <strong>{rate.displayName}</strong>
                                    <span className={styles.rateValue}>Rate: ${Number(rate.referenceRate).toFixed(2)} per {rate.unit}</span>
                                    <span className={styles.rateAssociation}>
                                        Applies to: {rate.taskName || 'Any Task'} / {rate.materialName || 'Any Material'} {rate.materialOptionName ? `(${rate.materialOptionName})` : ''}
                                    </span>
                                </div>
                                <div className={styles.rateActions}>
                                    <button onClick={() => handleOpenEditModal(rate)} className="btn btn-secondary btn-sm">Edit</button>
                                    <button onClick={() => handleDeleteRate(rate.id)} className="btn btn-danger btn-sm">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            <Link to="/dashboard" style={{ marginTop: '30px', display: 'inline-block' }}>
                <button className="btn btn-secondary">Back to Dashboard</button>
            </Link>

            {/* RENDER THE NEW MODAL */}
            {isModalOpen && (
                <RateTemplateFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveRate} // Use the new async handleSaveRate function
                    allTasks={allTasks}
                    allMaterials={allMaterials}
                    initialData={currentRate}
                    mode={modalMode}
                />
            )}
        </div>
    );
}

export default UserRateTemplatesPage;