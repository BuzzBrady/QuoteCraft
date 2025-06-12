// src/components/CustomMaterialsManager.tsx

import React, { useState } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { Material } from '../types'; // FIX: Changed CustomMaterial to Material
import MaterialFormModal from './MaterialFormModal';
import styles from './CustomMaterialsManager.module.css';
import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const CustomMaterialsManager: React.FC = () => {
    const { currentUser } = useAuth();
    // FIX: The hook is now typed with Material
    const { data: customMaterials, isLoading, refetch } = useUserCollection<Material>('customMaterials', 'name');

    const [isModalOpen, setIsModalOpen] = useState(false);
    // FIX: State is now typed with Material
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    const handleOpenModal = (material: Material | null = null) => {
        setEditingMaterial(material);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingMaterial(null);
        setIsModalOpen(false);
    };

    const handleSaveFromModal = async (savedData: Omit<Material, 'id'> | null) => {
        if (!currentUser || !savedData) {
            handleCloseModal();
            return;
        }

        try {
            if (editingMaterial && editingMaterial.id) {
                const materialRef = doc(db, 'users', currentUser.uid, 'customMaterials', editingMaterial.id);
                await updateDoc(materialRef, { ...savedData, updatedAt: serverTimestamp() });
            } else {
                const collectionRef = collection(db, 'users', currentUser.uid, 'customMaterials');
                await addDoc(collectionRef, { ...savedData, userId: currentUser.uid, isCustom: true, createdAt: serverTimestamp() });
            }
            refetch();
            handleCloseModal();
        } catch (error) {
            console.error("Error saving custom material: ", error);
        }
    };
    
    const handleDelete = async (materialId: string) => {
        if (!currentUser || !window.confirm("Are you sure you want to delete this material?")) return;
        try {
            const materialRef = doc(db, 'users', currentUser.uid, 'customMaterials', materialId);
            await deleteDoc(materialRef);
            refetch();
        } catch (error) {
            console.error("Error deleting custom material: ", error);
        }
    };

    return (
        <div className={styles.manager}>
            <button onClick={() => handleOpenModal()} className={styles.addButton}>
                Add New Material
            </button>
            {isLoading && <p>Loading materials...</p>}
            <ul className={styles.list}>
                {customMaterials.map((material) => (
                    <li key={material.id} className={styles.listItem}>
                        <span>{material.name}</span>
                        <div className={styles.actions}>
                            <button onClick={() => handleOpenModal(material)}>Edit</button>
                            {/* Ensure material.id is not undefined before passing */}
                            {material.id && <button onClick={() => handleDelete(material.id!)} className={styles.deleteButton}>Delete</button>}
                        </div>
                    </li>
                ))}
            </ul>
            {isModalOpen && currentUser && (
                 <MaterialFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSaveCallback={handleSaveFromModal}
                    userId={currentUser.uid}
                    initialData={editingMaterial}
                    mode={editingMaterial ? 'edit' : 'add'}
                />
            )}
        </div>
    );
};

export default CustomMaterialsManager;