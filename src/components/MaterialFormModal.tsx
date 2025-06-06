// src/components/MaterialFormModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { CustomMaterial, MaterialOption } from '../types';
import { db } from '../config/firebaseConfig';
import {
    doc, addDoc, updateDoc, collection, getDocs, writeBatch,
    serverTimestamp, query, orderBy, Timestamp, deleteField
} from 'firebase/firestore';
import styles from './MaterialFormModal.module.css'; // This CSS will now style the full modal
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/utils';

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
    // State for the main material form
    const [name, setName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [optionsAvailable, setOptionsAvailable] = useState<boolean>(false);
    const [defaultRate, setDefaultRate] = useState<string>('');
    const [defaultUnit, setDefaultUnit] = useState<string>('');

    // State for managing the options list
    const [options, setOptions] = useState<MaterialOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
    
    // State for the individual option input form
    const [currentOptionName, setCurrentOptionName] = useState<string>('');
    const [currentOptionDescription, setCurrentOptionDescription] = useState<string>('');
    const [currentOptionRateModifier, setCurrentOptionRateModifier] = useState<string>('');
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

    // General modal state
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    // --- FIX FOR BODY SCROLL ---
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalOverflow;
        }
        return () => { // Cleanup on unmount
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Effect to populate form when modal opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            setOptionsError(null);
            setIsSaving(false);
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
            } else { // 'add' mode
                setName(initialData?.name || '');
                setDescription(initialData?.description || '');
                setOptionsAvailable(initialData?.optionsAvailable || false);
                setDefaultRate(initialData?.defaultRate?.toString() || '');
                setDefaultUnit(initialData?.defaultUnit || 'item');
                setOptions([]); // Always start with empty options for a new material
            }
            // Reset option input form
            setCurrentOptionName('');
            setCurrentOptionDescription('');
            setCurrentOptionRateModifier('');
            setEditingOptionId(null);
        }
    }, [isOpen, mode, initialData]); // Removed userId, fetchOptions will get it from context

    const fetchOptions = async (materialId: string) => {
        if (!userId) return;
        setIsLoadingOptions(true);
        setOptionsError(null);
        try {
            const optionsRef = collection(db, `users/${userId}/customMaterials/${materialId}/options`);
            const q = query(optionsRef, orderBy('name_lowercase', 'asc'));
            const snapshot = await getDocs(q);
            setOptions(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MaterialOption)));
        } catch (err) {
            console.error("Error fetching material options:", err);
            setOptionsError("Failed to load existing options.");
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
        const newOptionData: Omit<MaterialOption, 'id'> = {
            name: currentOptionName.trim(),
            name_lowercase: currentOptionName.trim().toLowerCase(),
            description: currentOptionDescription.trim() || undefined,
            rateModifier: !isNaN(rateModifierValue) ? rateModifierValue : 0,
        };

        if (editingOptionId) {
            setOptions(options.map(opt => opt.id === editingOptionId ? { ...opt, ...newOptionData } : opt));
        } else {
            const tempId = `temp-${Date.now()}`;
            setOptions([...options, { id: tempId, ...newOptionData } as MaterialOption]);
        }
        // Reset form for next entry
        setCurrentOptionName('');
        setCurrentOptionDescription('');
        setCurrentOptionRateModifier('');
        setEditingOptionId(null);
    };

    const handleEditOption = (option: MaterialOption) => {
        setEditingOptionId(option.id);
        setCurrentOptionName(option.name);
        setCurrentOptionDescription(option.description || '');
        setCurrentOptionRateModifier(option.rateModifier?.toString() || '0');
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
        const rateString = defaultRate.trim();
        const rateValue = parseFloat(rateString);

        if (rateString !== '' && isNaN(rateValue)) {
            setFormError("Default Rate must be a valid number or be left blank.");
            return;
        }

        setIsSaving(true);
        const materialDataCore: Omit<CustomMaterial, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'> = {
            userId: userId,
            name: name.trim(),
            name_lowercase: name.trim().toLowerCase(),
            description: description.trim() || undefined,
            optionsAvailable: optionsAvailable,
            defaultUnit: defaultUnit.trim() || 'item',
            defaultRate: (rateString !== '' && !isNaN(rateValue)) ? rateValue : undefined,
        };
        
        try {
            let materialId = mode === 'edit' && initialData ? initialData.id : undefined;
            const materialCollectionRef = collection(db, `users/${userId}/customMaterials`);
            const batch = writeBatch(db);
            let materialDocRef;

            if (mode === 'edit' && materialId) {
                materialDocRef = doc(materialCollectionRef, materialId);
                batch.update(materialDocRef, { ...materialDataCore, updatedAt: serverTimestamp() as Timestamp });
            } else { // 'add' mode
                materialDocRef = doc(materialCollectionRef);
                materialId = materialDocRef.id;
                batch.set(materialDocRef, { ...materialDataCore, createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp });
            }

            if (!materialId) throw new Error("Material ID is missing for options handling.");

            const optionsRef = collection(db, `users/${userId}/customMaterials/${materialId}/options`);
            
            if (mode === 'edit') {
                const existingOptionsSnapshot = await getDocs(query(optionsRef));
                existingOptionsSnapshot.forEach(optionDoc => batch.delete(optionDoc.ref));
            }

            if (optionsAvailable && options.length > 0) {
                options.forEach(option => {
                    const newOptionRefForBatch = doc(optionsRef);
                    batch.set(newOptionRefForBatch, {
                        name: option.name, name_lowercase: option.name_lowercase,
                        description: option.description || null,
                        rateModifier: option.rateModifier || 0,
                    });
                });
            } else if (mode === 'edit' && !optionsAvailable && initialData?.optionsAvailable) {
                const existingOptionsSnapshot = await getDocs(query(optionsRef));
                existingOptionsSnapshot.forEach(optionDoc => batch.delete(optionDoc.ref));
            }

            await batch.commit();

            const savedMaterialSnap = await getDoc(materialDocRef);
            const savedMaterialData = savedMaterialSnap.exists() ? { id: savedMaterialSnap.id, ...savedMaterialSnap.data() } as CustomMaterial : null;

            onSaveCallback(savedMaterialData);

        } catch (err: any) {
            console.error("Error saving material:", err);
            setFormError(`Failed to save material: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{mode === 'add' ? 'Add New Custom Material' : 'Edit Custom Material'}</h2>
                    <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">&times;</button>
                </div>

                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit} id="material-form" className={styles.formContainer}>
                        {/* Material Name, Description, etc. */}
                        <div className="form-group">
                            <label htmlFor="materialFormNameInput">Material Name<span style={{color: 'var(--color-error)'}}>*</span>:</label>
                            <input type="text" id="materialFormNameInput" value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="e.g., Plasterboard Screws"/>
                        </div>

                        <div className={styles.formRow}>
                            <div className="form-group">
                                <label htmlFor="materialFormDefaultRate">Default Rate ($):</label>
                                <input type="number" id="materialFormDefaultRate" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} placeholder="e.g., 15.50" step="0.01" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="materialFormDefaultUnit">Default Unit:</label>
                                <input type="text" id="materialFormDefaultUnit" value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder="e.g., each, m, kg" list="common-material-units-datalist-modal" />
                                <datalist id="common-material-units-datalist-modal">
                                    {COMMON_UNITS.map(unit => (<option key={unit} value={unit} />))}
                                </datalist>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" checked={optionsAvailable} onChange={e => setOptionsAvailable(e.target.checked)} />
                                Has Options (e.g., sizes, colors with rate modifiers)
                            </label>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="materialFormDescription">Description:</label>
                            <textarea id="materialFormDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}/>
                        </div>

                        {optionsAvailable && (
                            <div className={styles.optionsSection}>
                                <h4 className={styles.optionsTitle}>Manage Options</h4>
                                {isLoadingOptions && <p className="text-muted text-center">Loading options...</p>}
                                {optionsError && <p className="text-danger text-center mt-sm">{optionsError}</p>}
                                
                                <div className={styles.optionInputRow}>
                                    <div className="form-group">
                                        <label htmlFor="optionFormName">Option Name<span style={{color: 'var(--color-error)'}}>*</span>:</label>
                                        <input type="text" id="optionFormName" placeholder="E.g., Large" value={currentOptionName} onChange={(e) => setCurrentOptionName(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="optionFormDescription">Option Description:</label>
                                        <input type="text" id="optionFormDescription" placeholder="E.g., 1200x600mm" value={currentOptionDescription} onChange={(e) => setCurrentOptionDescription(e.target.value)} />
                                    </div>
                                     <div className="form-group">
                                        <label htmlFor="optionFormRateModifier">Rate Modifier ($):</label>
                                        <input type="number" id="optionFormRateModifier" placeholder="e.g., 5 or -2.50" value={currentOptionRateModifier} onChange={(e) => setCurrentOptionRateModifier(e.target.value)} step="any" />
                                    </div>
                                    <div className={styles.optionAddButtonContainer}>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddOrUpdateOption} disabled={isSaving || !currentOptionName.trim()}>
                                            {editingOptionId ? 'Update' : '+ Add'}
                                        </button>
                                    </div>
                                </div>

                                {options.length > 0 && (
                                    <ul className={styles.optionsList}>
                                        {options.map((opt) => (
                                            <li key={opt.id} className={styles.optionItem}>
                                                <div>
                                                    <strong className={styles.optionItemName}>{opt.name}</strong>
                                                    {opt.description && <small className={styles.optionItemDescription}>{opt.description}</small>}
                                                    {(typeof opt.rateModifier === 'number' && opt.rateModifier !== 0) && <small className={styles.optionItemDescription}> Modifier: {formatCurrency(opt.rateModifier)}</small>}
                                                </div>
                                                <div className={styles.optionActions}>
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleEditOption(opt)} disabled={isSaving}>Edit</button>
                                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteOptionFromLocal(opt.id)} disabled={isSaving}>Del</button>
                                                </div>
                                            </li>))}
                                    </ul>
                                )}
                                {options.length === 0 && !isLoadingOptions && <p className="text-muted text-center" style={{fontSize: '0.9em'}}>No options added yet.</p>}
                            </div>
                        )}
                        {formError && <p className="text-danger text-center mt-sm">{formError}</p>}
                    </form>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
                    <button type="submit" form="material-form" className="btn btn-accent" disabled={isSaving}>
                        {isSaving ? 'Saving...' : (mode === 'add' ? 'Add Material' : 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MaterialFormModal;