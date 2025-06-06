// src/components/CustomMaterialsManager.tsx
import { useState, useEffect, useCallback } from 'react';
import styles from './CustomMaterialsManager.module.css';
import {
    collection,
    query,
    getDocs,
    addDoc,
    doc,
    // updateDoc, // updateDoc is handled by MaterialFormModal now
    deleteDoc,
    writeBatch,
    serverTimestamp,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { CustomMaterial, MaterialOption } from '../types'; // MaterialOption for the onSave prop of QuickAdd
import MaterialFormModal from './MaterialFormModal'; // For EDITING
import QuickAddMaterialModal from './QuickAddMaterialModal'; // For ADDING

interface CustomMaterialsManagerProps {
    // Props, if any
}

function CustomMaterialsManager({}: CustomMaterialsManagerProps) {
    const { currentUser } = useAuth();
    const [materials, setMaterials] = useState<CustomMaterial[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // State for MaterialFormModal (EDITING)
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [currentMaterialForEdit, setCurrentMaterialForEdit] = useState<CustomMaterial | null>(null);

    // State for QuickAddMaterialModal (ADDING)
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState<boolean>(false);

    const fetchMaterials = useCallback(async () => {
        if (!currentUser?.uid) {
            setMaterials([]);
            setIsLoading(false);
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
    }, [currentUser]);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    // Handlers for QuickAddMaterialModal
    const handleOpenQuickAddModal = () => {
        setIsQuickAddModalOpen(true);
    };

    const handleCloseQuickAddModal = () => {
        setIsQuickAddModalOpen(false);
    };

    const handleSaveFromQuickAddModal = async (data: {
        name: string;
        description: string;
        optionsAvailable: boolean;
        defaultRate?: number;
        defaultUnit?: string;
        options: MaterialOption[]; // These are the locally staged options from the modal
    }) => {
        if (!currentUser?.uid) {
            setError("You must be logged in to save a material.");
            return;
        }
        setIsLoading(true);
        setError(null);

        const materialDataToSave: Omit<CustomMaterial, 'id' | 'createdAt' | 'updatedAt'> = {
            userId: currentUser.uid,
            name: data.name.trim(),
            name_lowercase: data.name.trim().toLowerCase(),
            description: data.description.trim() || undefined,
            optionsAvailable: data.optionsAvailable,
            defaultUnit: data.defaultUnit?.trim() || 'item',
            defaultRate: (data.defaultRate !== undefined && !isNaN(data.defaultRate)) ? data.defaultRate : undefined
             // searchKeywords could be generated here if needed
        };

        try {
            const materialCollectionRef = collection(db, `users/${currentUser.uid}/customMaterials`);
            // Add the main material document
            const materialDocRef = await addDoc(materialCollectionRef, {
                ...materialDataToSave,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
            });
            const materialId = materialDocRef.id;

            // If options are available and there are options, save them to a subcollection
            if (data.optionsAvailable && data.options.length > 0) {
                const optionsRef = collection(db, `users/${currentUser.uid}/customMaterials/${materialId}/options`);
                const batch = writeBatch(db);
                data.options.forEach(option => {
                    const newOptionRefForBatch = doc(optionsRef); // Let Firestore generate ID
                    batch.set(newOptionRefForBatch, {
                        name: option.name,
                        name_lowercase: option.name_lowercase,
                        description: option.description || null,
                        rateModifier: option.rateModifier || 0,
                        createdAt: serverTimestamp() as Timestamp,
                        updatedAt: serverTimestamp() as Timestamp,
                    });
                });
                await batch.commit();
            }

            await fetchMaterials(); // Refresh the list
            handleCloseQuickAddModal();
        } catch (err: any) {
            console.error("Error saving new material from quick add:", err);
            setError(`Failed to save new material: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    // Handlers for MaterialFormModal (EDITING)
    const handleOpenEditModal = (material: CustomMaterial) => {
        setCurrentMaterialForEdit(material); // Pass the full material object
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setCurrentMaterialForEdit(null);
    };

    const handleSaveFromEditModal = async (savedMaterial: CustomMaterial | null) => {
        // MaterialFormModal now handles its own save. This callback just closes and refetches.
        if (savedMaterial) { // If save was successful (modal might pass back the saved data or just signal success)
            await fetchMaterials();
        }
        handleCloseEditModal();
    };

    const handleDeleteMaterial = async (materialId: string, materialHasOptions: boolean) => {
        if (!currentUser?.uid || !window.confirm("Are you sure you want to delete this material and all its options? This cannot be undone.")) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const batch = writeBatch(db);
            const materialDocRef = doc(db, `users/${currentUser.uid}/customMaterials`, materialId);

            if (materialHasOptions) {
                const optionsCollectionRef = collection(db, `users/${currentUser.uid}/customMaterials/${materialId}/options`);
                const optionsSnapshot = await getDocs(optionsCollectionRef);
                if (!optionsSnapshot.empty) {
                    optionsSnapshot.docs.forEach(optionDoc => batch.delete(optionDoc.ref));
                }
            }
            batch.delete(materialDocRef);
            await batch.commit();
            await fetchMaterials(); // Refresh list
        } catch (err: any) {
            console.error("Error deleting material:", err);
            setError(`Failed to delete material: ${err.message}.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return <p className="text-warning">Please log in to manage your custom materials.</p>;
    }

    return (
        <div className={styles.managerContainer}>
            <h3 className="mb-lg">My Custom Materials</h3>
            <button className="btn btn-primary mb-lg" onClick={handleOpenQuickAddModal} disabled={isLoading}>
                + Add New Material
            </button>

            {isLoading && <p className={styles.loadingText || "text-info"}>Loading materials...</p>}
            {error && <p className="text-danger">{error}</p>}

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
                                {material.description && <><br /><small className={styles.descriptionText}>Desc: {material.description}</small></>}
                            </div>
                            <div className={styles.actions}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpenEditModal(material)}
                                    disabled={isLoading}
                                >
                                    Edit / Manage Options
                                </button>
                                <button
                                    className="btn btn-danger btn-sm ml-xs"
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

            {/* Modal for ADDING new materials */}
            {isQuickAddModalOpen && currentUser?.uid && (
                <QuickAddMaterialModal
                    isOpen={isQuickAddModalOpen}
                    onClose={handleCloseQuickAddModal}
                    onSave={handleSaveFromQuickAddModal}
                    // initialName can be omitted if QuickAddMaterialModal handles default empty string
                />
            )}

            {/* Modal for EDITING existing materials */}
            {isEditModalOpen && currentUser?.uid && currentMaterialForEdit && (
                <MaterialFormModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onSaveCallback={handleSaveFromEditModal} // This callback is for after MaterialFormModal saves itself
                    userId={currentUser.uid}
                    initialData={currentMaterialForEdit} // Pass the whole material object
                    mode="edit"
                />
            )}
        </div>
    );
}

export default CustomMaterialsManager;