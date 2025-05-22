// src/components/MaterialFormModal.tsx
import { useState, useEffect, FormEvent } from 'react';
import { CustomMaterial, MaterialOption } from '../types';
import { db } from '../config/firebaseConfig';
import {
    doc, addDoc, updateDoc, collection, getDocs, getDoc, writeBatch,
    serverTimestamp, query, orderBy, Timestamp
} from 'firebase/firestore';
import GenericFormModal from './GenericFormModal'; // Import the generic modal
import styles from './MaterialFormModal.module.css';   // Import specific styles for this form's content

// Define common units
const COMMON_UNITS = [
    "item", "each", "unit", "set",
    "m", "m²", "m³", "lm",
    "kg", "tonne", "g",
    "L", "mL",
    "sheet", "length", "roll", "bag", "box", "pack",
];

interface MaterialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveCallback: (savedMaterial: CustomMaterial | null) => void;
    userId: string;
    initialData?: CustomMaterial | null;
    mode: 'add' | 'edit';
}

function MaterialFormModal({
    isOpen,
    onClose,
    onSaveCallback,
    userId,
    initialData,
    mode,
}: MaterialFormModalProps) {
    const [name, setName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [optionsAvailable, setOptionsAvailable] = useState<boolean>(false);
    const [defaultRate, setDefaultRate] = useState<string>('');
    const [defaultUnit, setDefaultUnit] = useState<string>('');
    const [options, setOptions] = useState<MaterialOption[]>([]);
    const [currentOptionName, setCurrentOptionName] = useState<string>('');
    const [currentOptionDescription, setCurrentOptionDescription] = useState<string>('');
    const [currentOptionRateModifier, setCurrentOptionRateModifier] = useState<string>('');
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            setOptionsError(null);
            setIsSaving(false); // Reset saving state when modal opens
            if (mode === 'edit' && initialData) {
                setName(initialData.name || '');
                setDescription(initialData.description || '');
                setOptionsAvailable(initialData.optionsAvailable || false);
                setDefaultRate(initialData.defaultRate?.toString() || '');
                setDefaultUnit(initialData.defaultUnit || 'item');
                if (initialData.optionsAvailable && initialData.id) {
                    fetchOptions(initialData.id);
                } else {
                    setOptions([]);
                }
            } else { // Add mode
                setName(initialData?.name || ''); // Keep initialName if provided (e.g., from QuickAdd)
                setDescription(initialData?.description || '');
                setOptionsAvailable(initialData?.optionsAvailable || false);
                setDefaultRate(initialData?.defaultRate?.toString() || '');
                setDefaultUnit(initialData?.defaultUnit || 'item');
                setOptions(initialData && (initialData as any).options ? (initialData as any).options : []);
            }
            // Reset option form fields
            setCurrentOptionName('');
            setCurrentOptionDescription('');
            setCurrentOptionRateModifier('');
            setEditingOptionId(null);
        }
    }, [isOpen, mode, initialData, userId]);

    const fetchOptions = async (materialId: string) => {
        setIsLoadingOptions(true);
        setOptionsError(null);
        try {
            const optionsRef = collection(db, `users/${userId}/customMaterials/${materialId}/options`);
            const q = query(optionsRef, orderBy('name_lowercase', 'asc'));
            const snapshot = await getDocs(q);
            setOptions(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MaterialOption)));
        } catch (err) {
            console.error("Error fetching material options:", err);
            setOptionsError("Failed to load options.");
        } finally {
            setIsLoadingOptions(false);
        }
    };

    const handleAddOrUpdateOption = () => {
        if (!currentOptionName.trim()) {
            setOptionsError("Option name cannot be empty.");
            return;
        }
        setOptionsError(null);
        const rateModifierValue = parseFloat(currentOptionRateModifier);
        const newOptionData = {
            name: currentOptionName.trim(),
            name_lowercase: currentOptionName.trim().toLowerCase(),
            description: currentOptionDescription.trim(),
            rateModifier: !isNaN(rateModifierValue) ? rateModifierValue : 0,
        };

        if (editingOptionId) {
            setOptions(options.map(opt => opt.id === editingOptionId ? { ...opt, ...newOptionData } : opt));
        } else {
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            setOptions([...options, { id: tempId, ...newOptionData } as MaterialOption]);
        }
        setCurrentOptionName('');
        setCurrentOptionDescription('');
        setCurrentOptionRateModifier('');
        setEditingOptionId(null);
    };

    const handleEditOption = (option: MaterialOption) => {
        setEditingOptionId(option.id);
        setCurrentOptionName(option.name);
        setCurrentOptionDescription(option.description || '');
        setCurrentOptionRateModifier(option.rateModifier?.toString() || '');
    };

    const handleDeleteOptionFromLocal = (optionId: string) => {
        setOptions(options.filter(opt => opt.id !== optionId));
        if (editingOptionId === optionId) {
            setCurrentOptionName('');
            setCurrentOptionDescription('');
            setCurrentOptionRateModifier('');
            setEditingOptionId(null);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);
        if (!name.trim()) {
            setFormError("Material name is required."); return;
        }
        const rateValue = parseFloat(defaultRate);
        setIsSaving(true);
        const materialDataToSave: Partial<CustomMaterial> = {
            userId: userId, name: name.trim(), name_lowercase: name.trim().toLowerCase(),
            description: description.trim(), optionsAvailable: optionsAvailable,
            defaultUnit: defaultUnit.trim() || 'item', updatedAt: serverTimestamp() as Timestamp,
        };

        if (!isNaN(rateValue) && defaultRate.trim() !== '') {
            materialDataToSave.defaultRate = rateValue;
        } else if (defaultRate.trim() === '') {
            materialDataToSave.defaultRate = undefined;
        } else {
            setFormError("Default Rate must be a valid number if provided.");
            setIsSaving(false);
            return;
        }

        try {
            let materialId = initialData?.id;
            const materialCollectionRef = collection(db, `users/${userId}/customMaterials`);
            if (mode === 'add') {
                const docRef = await addDoc(materialCollectionRef, { ...materialDataToSave, createdAt: serverTimestamp() as Timestamp });
                materialId = docRef.id;
            } else if (materialId) {
                await updateDoc(doc(materialCollectionRef, materialId), materialDataToSave);
            }
            if (!materialId) throw new Error("Material ID is missing for options handling.");

            const optionsRef = collection(db, `users/${userId}/customMaterials/${materialId}/options`);
            const batch = writeBatch(db);
            if (mode === 'edit') { // Clear old options only if editing and options were fetched
                const existingOptionsSnapshot = await getDocs(optionsRef);
                existingOptionsSnapshot.forEach(optionDoc => batch.delete(optionDoc.ref));
            }
            if (optionsAvailable && options.length > 0) {
                options.forEach(option => {
                    const { id: tempId, ...optionDataForDb } = option; // Exclude tempId
                    const newOptionRef = doc(optionsRef); // Let Firestore generate ID
                    batch.set(newOptionRef, {
                        ...optionDataForDb,
                        name_lowercase: option.name.toLowerCase(),
                        createdAt: serverTimestamp() as Timestamp,
                        updatedAt: serverTimestamp() as Timestamp,
                    });
                });
            }
            await batch.commit();

            // Fetch the saved material to pass back (necessary for 'add' mode to get the ID)
            const savedMaterialDoc = await getDoc(doc(materialCollectionRef, materialId));
            const savedMaterial = savedMaterialDoc.exists() ? { id: savedMaterialDoc.id, ...savedMaterialDoc.data() } as CustomMaterial : null;

            onSaveCallback(savedMaterial); // Call with the saved material
            onClose(); // Close the modal on success

        } catch (err: any) {
 console.error("Error saving material:", err);
 setFormError(`Failed to save material: ${err.message}`);
 onSaveCallback(null); // Call with null on save failure
        } finally {
            setIsSaving(false);
        }

    };

    const footerContent = (
        <>
            <button type="button" className={styles.secondaryButton} onClick={() => {
 onSaveCallback(null); // Call with null when cancelled
 onClose();
            }} disabled={isSaving}>Cancel</button>
            <button type="submit" form="material-form" className={styles.primaryButton} disabled={isSaving}>
                {isSaving ? 'Saving...' : (mode === 'add' ? 'Add Material' : 'Save Changes')}
            </button>
        </>
    );

    return (
        <GenericFormModal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'add' ? 'Add New Custom Material' : 'Edit Custom Material'}
            footerContent={footerContent}
        >
            <form onSubmit={handleSubmit} id="material-form">
                <div className={styles.formGroup}>
                    <label htmlFor="materialFormNameInput" className={styles.label}>Material Name<span style={{color: 'red'}}>*</span>:</label>
                    <input type="text" id="materialFormNameInput" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required autoFocus/>
                </div>

                <div className={styles.formRow}>
                    <div>
                        <label htmlFor="materialFormDefaultRate" className={styles.label}>Default Rate ($):</label>
                        <input type="number" id="materialFormDefaultRate" className={styles.input} value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} placeholder="e.g., 15.50" step="0.01" />
                    </div>
                    <div>
                        <label htmlFor="materialFormDefaultUnit" className={styles.label}>Default Unit:</label>
                        <input type="text" id="materialFormDefaultUnit" className={styles.input} value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder="e.g., each, m, kg" list="common-material-units-datalist-modal" />
                        <datalist id="common-material-units-datalist-modal">
                            {COMMON_UNITS.map(unit => (<option key={unit} value={unit} />))}
                        </datalist>
                    </div>
                </div>

                {/* Moved "Has Options" checkbox before "Description" */}
                <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" className={styles.checkboxInput} checked={optionsAvailable} onChange={(e) => setOptionsAvailable(e.target.checked)} />
                        Has Options (e.g., sizes, colors, rate modifiers)
                    </label>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="materialFormDescription" className={styles.label}>Description:</label>
                    <textarea id="materialFormDescription" className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>


                {optionsAvailable && (
                    <div className={styles.optionsSection}>
                        <h4 className={styles.optionsTitle}>Manage Options</h4>
                        {isLoadingOptions && <p>Loading options...</p>}
                        {optionsError && <p className={styles.errorMessage}>{optionsError}</p>}
                        
                        <div className={styles.optionInputRow}>
                            <div className={styles.optionInputGroup}>
                                <label htmlFor="optionFormName" className={styles.label}>Option Name:</label>
                                <input type="text" id="optionFormName" placeholder="E.g., Large" className={styles.input} value={currentOptionName} onChange={(e) => setCurrentOptionName(e.target.value)} />
                            </div>
                            <div className={styles.optionInputGroup}>
                                <label htmlFor="optionFormDescription" className={styles.label}>Option Description:</label>
                                <input type="text" id="optionFormDescription" placeholder="E.g., 1200x600mm" className={styles.input} value={currentOptionDescription} onChange={(e) => setCurrentOptionDescription(e.target.value)} />
                            </div>
                             <div className={styles.optionInputGroup}>
                                <label htmlFor="optionFormRateModifier" className={styles.label}>Rate Modifier ($):</label>
                                <input type="number" id="optionFormRateModifier" placeholder="e.g., +5.00 or -2.50" className={styles.input} value={currentOptionRateModifier} onChange={(e) => setCurrentOptionRateModifier(e.target.value)} step="any" />
                            </div>
                            <div className={styles.optionAddButtonContainer}>
                                <button type="button" className={styles.primaryButtonSmall} onClick={handleAddOrUpdateOption} disabled={isSaving}> {editingOptionId ? 'Update' : '+ Add'} </button>
                            </div>
                        </div>

                        {options.length > 0 && (
                            <ul className={styles.optionsList}>
                                {options.map((opt) => (
                                    <li key={opt.id} className={styles.optionItem}>
                                        <div>
                                            <strong className={styles.optionItemName}>{opt.name}</strong>
                                            {opt.description && <small className={styles.optionItemDescription}>{opt.description}</small>}
                                            {(typeof opt.rateModifier === 'number' && opt.rateModifier !== 0) && <small className={styles.optionItemDescription}> Modifier: {opt.rateModifier > 0 ? '+' : ''}{opt.rateModifier.toFixed(2)}</small>}
                                        </div>
                                        <div className={styles.optionActions}>
                                            <button type="button" className={styles.optionActionButton} onClick={() => handleEditOption(opt)} disabled={isSaving}>Edit</button>
                                            <button type="button" className={styles.optionDeleteButton} onClick={() => handleDeleteOptionFromLocal(opt.id)} disabled={isSaving}>Del</button>
                                        </div>
                                    </li>))}
                            </ul>
                        )}
                        {options.length === 0 && !isLoadingOptions && <p style={{fontSize: '0.9em', color: '#666', textAlign: 'center'}}>No options added yet for this material.</p>}
                    </div>
                )}
                {formError && <p className={styles.errorMessage}>{formError}</p>}
            </form>
        </GenericFormModal>
    );
}

export default MaterialFormModal;
