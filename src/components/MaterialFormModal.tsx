// src/components/MaterialFormModal.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import { Material, MaterialOption } from '../types'; // FIX: Changed CustomMaterial to Material
import { v4 as uuidv4 } from 'uuid';
import styles from './MaterialFormModal.module.css';

// This defines the shape of the data the form manages internally
type MaterialFormData = Omit<Material, 'id'>;

interface MaterialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveCallback: (material: Material | null) => void;
    initialData?: Material | null; // FIX: Use Material type
    mode: 'add' | 'edit';
    userId: string;
}

const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
    isOpen,
    onClose,
    onSaveCallback,
    initialData,
    mode,
}) => {
    // State for the main material form
    const [formData, setFormData] = useState<Partial<MaterialFormData>>({
        name: '',
        defaultRate: 0,
        defaultUnit: 'item',
        description: '',
        optionsAvailable: false,
    });
    
    // State for managing the options list within the modal
    const [options, setOptions] = useState<MaterialOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    name: initialData.name || '',
                    defaultRate: initialData.defaultRate || 0,
                    defaultUnit: initialData.defaultUnit || 'item',
                    description: initialData.description || '',
                    optionsAvailable: initialData.optionsAvailable || false,
                });
                setOptions(initialData.options || []);
            } else {
                // Reset form for 'add' mode
                setFormData({ name: '', defaultRate: 0, defaultUnit: 'item', description: '', optionsAvailable: false });
                setOptions([]);
            }
        }
    }, [isOpen, initialData, mode]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
            if (!checked) {
                setOptions([]); // Clear options if checkbox is unchecked
            }
        } else {
            const val = type === 'number' ? parseFloat(value) || 0 : value;
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    const handleOptionChange = (index: number, field: keyof MaterialOption, value: string) => {
        const newOptions = [...options];
        const optionToUpdate = { ...newOptions[index] };
        
        if (field === 'rateModifier') {
            optionToUpdate[field] = parseFloat(value) || 0;
        } else {
            (optionToUpdate[field] as any) = value;
        }
        
        if (field === 'name') {
            optionToUpdate.name_lowercase = value.toLowerCase();
        }

        newOptions[index] = optionToUpdate;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, { id: uuidv4(), name: '', rateModifier: 0, description: '' }]);
    };

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const finalMaterialData: Material = {
            id: initialData?.id || uuidv4(), // Use existing ID for edits
            name: formData.name || '',
            defaultRate: formData.defaultRate || 0,
            defaultUnit: formData.defaultUnit || 'item',
            description: formData.description || '',
            optionsAvailable: formData.optionsAvailable || false,
            options: formData.optionsAvailable ? options : [],
        };
        
        await onSaveCallback(finalMaterialData);
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className={styles.modalHeader}>
                        <h2>{mode === 'add' ? 'Add Custom Material' : 'Edit Custom Material'}</h2>
                        <button type="button" onClick={onClose} className={styles.closeButton}>&times;</button>
                    </header>
                    <div className={styles.modalBody}>
                        {/* Form fields for the material */}
                        <div className={styles.formGroup}>
                            <label>Material Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleFormChange} required />
                        </div>
                        {/* ... other material fields ... */}

                        <div className={styles.formGroup}>
                            <label>
                                <input type="checkbox" name="optionsAvailable" checked={formData.optionsAvailable} onChange={handleFormChange} />
                                Has Options (e.g., Small, Medium, Large)
                            </label>
                        </div>

                        {formData.optionsAvailable && (
                            <div className={styles.optionsSection}>
                                <h4>Material Options</h4>
                                {options.map((option, index) => (
                                    <div key={index} className={styles.optionRow}>
                                        <input type="text" placeholder="Option Name (e.g., Small)" value={option.name} onChange={(e) => handleOptionChange(index, 'name', e.target.value)} />
                                        <input type="number" placeholder="Rate Modifier ($)" value={option.rateModifier} onChange={(e) => handleOptionChange(index, 'rateModifier', e.target.value)} />
                                        <button type="button" onClick={() => removeOption(index)}>&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addOption} className={styles.addOptionButton}>+ Add Option</button>
                            </div>
                        )}
                    </div>
                    <footer className={styles.modalFooter}>
                        <button type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
                        <button type="submit" className="button-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Material'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default MaterialFormModal;