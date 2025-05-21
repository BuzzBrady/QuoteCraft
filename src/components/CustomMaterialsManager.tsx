// src/components/CustomMaterialsManager.tsx
import { useState, useEffect, useCallback } from 'react'; // <-- ADDED/CORRECTED REACT IMPORTS
import styles from './CustomMaterialsManager.module.css';
import {
    collection,
    query,
    // where, // Not strictly needed for the current version but often used
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    orderBy,
    // Timestamp // Not directly used as a type here, but useful for type checking if needed
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext'; // <-- ADDED
import { CustomMaterial, MaterialOption } from '../types'; // <-- ADDED (Adjust path if needed)
import MaterialFormModal from './MaterialFormModal'; // <-- ADDED

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
        if (!currentUser) {
            setMaterials([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const materialsCollectionRef = collection(db, `users/${currentUser.uid}/customMaterials`);
            const q = query(materialsCollectionRef, orderBy('name_lowercase', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedMaterials: CustomMaterial[] = querySnapshot.docs.map(docSnap => ({ // Renamed doc to docSnap to avoid conflict if Timestamp was imported as doc
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

    // Modal Handlers
    const handleOpenModalForAdd = () => {
        setCurrentMaterial(null);
        setModalMode('add');
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (material: CustomMaterial) => {
        // For now, just pass the material. The modal will handle fetching its own options if needed,
        // or we can enhance this later to pre-fetch options here.
        setCurrentMaterial(material);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentMaterial(null);
    };

    const handleSaveMaterialCallback = async () => {
        await fetchMaterials();
        handleCloseModal();
    };

    const handleDeleteMaterial = async (materialId: string, materialHasOptions: boolean) => {
        if (!currentUser) {
            setError("You must be logged in to delete a material.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this custom material? If it has options, those will also be deleted. This action cannot be undone.")) {
            setIsLoading(true);
            setError(null);
            try {
                const batch = writeBatch(db);
                const materialDocRef = doc(db, `users/${currentUser.uid}/customMaterials`, materialId);

                if (materialHasOptions) {
                    const optionsCollectionRef = collection(db, `users/${currentUser.uid}/customMaterials/${materialId}/options`);
                    const optionsSnapshot = await getDocs(optionsCollectionRef);
                    if (!optionsSnapshot.empty) {
                        optionsSnapshot.docs.forEach(optionDoc => {
                            batch.delete(optionDoc.ref);
                        });
                    }
                }
                batch.delete(materialDocRef);
                await batch.commit();
                await fetchMaterials();
            } catch (err: any) {
                console.error("Error deleting material:", err);
                setError(`Failed to delete material: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (!currentUser) {
        return <p>Please log in to manage your custom materials.</p>;
    }

    // --- CORRECTED JSX RETURN ---
    return (
        // Use className from imported styles object
        <div className={styles.managerContainer}>
            <h3>My Custom Materials</h3>
            {/* Use className from imported styles object */}
            <button className={styles.button} onClick={handleOpenModalForAdd} disabled={isLoading}>
                + Add New Material
            </button>

            {isLoading && <p>Loading materials...</p>}
            {/* Use className for error message styling if defined in CSS */}
            {error && <p className={styles.error || ''} style={!styles.error ? { color: 'red'} : {}}>{error}</p>} {/* Added fallback inline style if .error class doesn't exist */}

            {!isLoading && !error && materials.length === 0 && (
                <p>You haven't added any custom materials yet.</p>
            )}

            {!isLoading && !error && materials.length > 0 && (
                 // Use className for the list container
                 <ul className={styles.itemList}>
                    {materials.map(material => ( // Removed stray backslash here
                        // Use className for list item
                        <li key={material.id} className={styles.item}>
                           {/* Use className for item details section */}
                           <div className={styles.itemDetails}>
                                <strong>{material.name}</strong>
                                <br />
                                <small>Options: {material.optionsAvailable ? 'Yes' : 'No'}</small>
                                {(material.defaultRate !== undefined && material.defaultRate !== null) && (
                                    <>
                                        <br />
                                        {/* Consider helper function for formatting currency */}
                                        <small> Rate: ${material.defaultRate.toFixed(2)} per {material.defaultUnit || 'item'} </small>
                                    </>
                                )}
                                {material.description && <><br /><small>Desc: {material.description}</small></>}
                            </div>
                            {/* ADDED BACK: Actions div with buttons using className */}
                            <div className={styles.actions}>
                                <button
                                    className={styles.editButton} // Use styles.editButton
                                    onClick={() => handleOpenModalForEdit(material)}
                                    disabled={isLoading}
                                >
                                    Edit / Manage Options
                                </button>
                                <button
                                    className={styles.deleteButton} // Use styles.deleteButton
                                    onClick={() => handleDeleteMaterial(material.id, material.optionsAvailable || false)}
                                    disabled={isLoading}
                                >
                                    Delete
                                </button>
                            </div>
                        </li> // Removed stray backslash here
                    ))}
                </ul>
            )}

            {/* Modal rendering (should be correct) */}
            {isModalOpen && currentUser && (
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

           