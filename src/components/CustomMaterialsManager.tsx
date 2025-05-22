// src/components/CustomMaterialsManager.tsx
import { useState, useEffect, useCallback } from 'react';
import styles from './CustomMaterialsManager.module.css';
import {
    collection,
    query,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    orderBy,
    Timestamp // Added Timestamp for type safety
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { CustomMaterial, MaterialOption } from '../types';
import MaterialFormModal from './MaterialFormModal';

interface CustomMaterialsManagerProps {
    // Props, if any
}

function CustomMaterialsManager({}: CustomMaterialsManagerProps) {
    const { currentUser } = useAuth();
    const [materials, setMaterials] = useState<CustomMaterial[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentMaterial, setCurrentMaterial] = useState<CustomMaterial & { options?: MaterialOption[] } | null>(null);

    // Fetch Materials
    const fetchMaterials = useCallback(async () => {
        if (!currentUser?.uid) {
            setMaterials([]);
            setIsLoading(false); // Stop loading if no user
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const materialsCollectionRef = collection(db, `users/${currentUser.uid}/customMaterials`);
            const q = query(materialsCollectionRef, orderBy('name_lowercase', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedMaterials: CustomMaterial[] = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as CustomMaterial));
            setMaterials(fetchedMaterials);
        } catch (err: any) {
            console.error("Error fetching custom materials:", err);
            setError("Failed to fetch custom materials. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]); // Dependency on currentUser

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    // Modal Handlers
    const handleOpenModalForAdd = () => {
        setCurrentMaterial(null);
        setModalMode('add');
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (material: CustomMaterial) => {
        setCurrentMaterial(material);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentMaterial(null);
    };

    const handleSaveMaterialCallback = async () => {
        await fetchMaterials(); // Refresh list
        handleCloseModal();     // Close modal
    };

    const handleDeleteMaterial = async (materialId: string, materialHasOptions: boolean) => {
        if (!currentUser?.uid) {
            setError("You must be logged in to delete a material.");
            console.error("Delete Material: No current user found.");
            return;
        }

        // MODIFICATION: Removed window.confirm to allow deletion to proceed in iframe environments.
        // For a production app, implement a custom confirmation modal here.
        console.log(`Proceeding with delete for material ID: ${materialId}. Has options: ${materialHasOptions}`);

        setIsLoading(true);
        setError(null);
        try {
            const batch = writeBatch(db);
            const materialDocRef = doc(db, `users/${currentUser.uid}/customMaterials`, materialId);

            // If the material has options, delete them from the subcollection
            if (materialHasOptions) {
                const optionsCollectionRef = collection(db, `users/${currentUser.uid}/customMaterials/${materialId}/options`);
                const optionsSnapshot = await getDocs(optionsCollectionRef);
                if (!optionsSnapshot.empty) {
                    console.log(`Deleting ${optionsSnapshot.docs.length} options for material ${materialId}`);
                    optionsSnapshot.docs.forEach(optionDoc => {
                        batch.delete(optionDoc.ref);
                    });
                } else {
                    console.log(`No options found in subcollection for material ${materialId}, though materialHasOptions was true.`);
                }
            }
            
            // Delete the main material document
            batch.delete(materialDocRef);
            
            await batch.commit();
            console.log(`Material ${materialId} and its options (if any) deleted successfully from Firestore.`);
            
            await fetchMaterials(); // Refresh the list in the UI
        } catch (err: any) {
            console.error("Error deleting material:", err);
            setError(`Failed to delete material: ${err.message}. Check console for details.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return <p>Please log in to manage your custom materials.</p>;
    }

    return (
        <div className={styles.managerContainer}>
            <h3>My Custom Materials</h3>
            <button className={styles.button} onClick={handleOpenModalForAdd} disabled={isLoading}>
                + Add New Material
            </button>

            {isLoading && <p>Loading materials...</p>}
            {error && <p className={styles.error || ''} style={!styles.error ? { color: 'red'} : {}}>{error}</p>}

            {!isLoading && !error && materials.length === 0 && (
                <p>You haven't added any custom materials yet.</p>
            )}

            {!isLoading && !error && materials.length > 0 && (
                 <ul className={styles.itemList}>
                    {materials.map(material => (
                        <li key={material.id} className={styles.item}>
                           <div className={styles.itemDetails}>
                                <strong>{material.name}</strong>
                                <br />
                                <small>Options: {material.optionsAvailable ? 'Yes' : 'No'}</small>
                                {(material.defaultRate !== undefined && material.defaultRate !== null) && (
                                    <>
                                        <br />
                                        <small> Rate: ${Number(material.defaultRate).toFixed(2)} per {material.defaultUnit || 'item'} </small>
                                    </>
                                )}
                                {material.description && <><br /><small>Desc: {material.description}</small></>}
                            </div>
                            <div className={styles.actions}>
                                <button
                                    className={styles.editButton}
                                    onClick={() => handleOpenModalForEdit(material)}
                                    disabled={isLoading}
                                >
                                    Edit / Manage Options
                                </button>
                                <button
                                    className={styles.deleteButton}
                                    onClick={() => handleDeleteMaterial(material.id, material.optionsAvailable || false)}
                                    disabled={isLoading}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isModalOpen && currentUser?.uid && (
                <MaterialFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSaveCallback={handleSaveMaterialCallback}
                    userId={currentUser.uid}
                    initialData={currentMaterial}
                    mode={modalMode}
                />
            )}
        </div>
    );
}

export default CustomMaterialsManager;
