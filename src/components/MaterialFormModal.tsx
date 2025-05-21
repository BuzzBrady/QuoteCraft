// src/components/MaterialFormModal.tsx
import { useState, useEffect, FormEvent } from 'react';
// ... other imports (firebase, types, db config)
import { CustomMaterial, MaterialOption } from '../types';
import { db } from '../config/firebaseConfig';
import {
    doc, addDoc, updateDoc, collection, getDocs, writeBatch,
    serverTimestamp, query, orderBy, Timestamp // Added Timestamp for type safety
} from 'firebase/firestore';

// Define common units (can be moved to a constants file if used elsewhere)
const COMMON_UNITS = [
    "item", "each", "unit", "set",
    "m", "m²", "m³", "lm", // meter, square meter, cubic meter, linear meter
    "kg", "tonne", "g",
    "L", "mL", // liter, milliliter
    "sheet", "length", "roll", "bag", "box", "pack",
    // Add any other common material units
];

interface MaterialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveCallback: () => Promise<void>;
    userId: string;
    initialData?: CustomMaterial | null;
    mode: 'add' | 'edit';
}

// --- STYLES (Assuming they are defined as previously discussed) ---
const modalStyles: React.CSSProperties = { /* ... */ };
const modalContentStyles: React.CSSProperties = { /* ... */ };
const formGroupStyles: React.CSSProperties = { /* ... */ };
const labelStyles: React.CSSProperties = { /* ... */ };
const inputStyles: React.CSSProperties = { /* ... */ };
const textareaStyles: React.CSSProperties = { /* ... */ };
const buttonContainerStyles: React.CSSProperties = { /* ... */ };
const buttonStyles: React.CSSProperties = { /* ... */ };
const primaryButtonStyles: React.CSSProperties = { /* ... */ };
const secondaryButtonStyles: React.CSSProperties = { /* ... */ };
const optionsSectionStyles: React.CSSProperties = { /* ... */ };
const optionItemStyles: React.CSSProperties = { /* ... */ };
const optionInputStyles: React.CSSProperties = { /* ... */ };
const optionButtonStyles: React.CSSProperties = { /* ... */ };
const optionActionButtonStyles: React.CSSProperties = { /* ... */ };
const optionDeleteButtonStyles: React.CSSProperties = { /* ... */ };
// (Ensure all styles from the previous full MaterialFormModal are defined here)


function MaterialFormModal({
    isOpen,
    onClose,
    onSaveCallback,
    userId,
    initialData,
    mode,
}: MaterialFormModalProps) {
    // Material fields
    const [name, setName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [optionsAvailable, setOptionsAvailable] = useState<boolean>(false);
    const [defaultRate, setDefaultRate] = useState<string>(''); // Store as string for input, convert on save
    const [defaultUnit, setDefaultUnit] = useState<string>('');

    // Options management (as before)
    const [options, setOptions] = useState<MaterialOption[]>([]);
    const [currentOptionName, setCurrentOptionName] = useState<string>('');
    const [currentOptionDescription, setCurrentOptionDescription] = useState<string>('');
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

    // Modal state (as before)
    const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            setOptionsError(null);
            if (mode === 'edit' && initialData) {
                setName(initialData.name || '');
                setDescription(initialData.description || '');
                setOptionsAvailable(initialData.optionsAvailable || false);
                setDefaultRate(initialData.defaultRate?.toString() || ''); // Convert number to string for input
                setDefaultUnit(initialData.defaultUnit || 'item'); // Default to 'item' if not set

                if (initialData.optionsAvailable && initialData.id) {
                    fetchOptions(initialData.id);
                } else {
                    setOptions([]);
                }
            } else { // Add mode
                setName('');
                setDescription('');
                setOptionsAvailable(false);
                setDefaultRate('');
                setDefaultUnit('item'); // Sensible default
                setOptions([]);
            }
            setCurrentOptionName('');
            setCurrentOptionDescription('');
            setEditingOptionId(null);
        }
    }, [isOpen, mode, initialData, userId]); // Added userId as it's used in fetchOptions

    const fetchOptions = async (materialId: string) => { /* ... (same as before) ... */
        setIsLoadingOptions(true);
        setOptionsError(null);
        try {
            const optionsRef = collection(db, `users/${userId}/customMaterials/${materialId}/options`);
            const q = query(optionsRef, orderBy('name_lowercase', 'asc'));
            const snapshot = await getDocs(q);
            const fetchedOptions: MaterialOption[] = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as MaterialOption));
            setOptions(fetchedOptions);
        } catch (err) {
            console.error("Error fetching material options:", err);
            setOptionsError("Failed to load options.");
        } finally {
            setIsLoadingOptions(false);
        }
    };
    const handleAddOrUpdateOption = () => { /* ... (same as before) ... */
        if (!currentOptionName.trim()) {
            setOptionsError("Option name cannot be empty.");
            return;
        }
        setOptionsError(null);

        const newOptionData = {
            name: currentOptionName.trim(),
            name_lowercase: currentOptionName.trim().toLowerCase(),
            description: currentOptionDescription.trim(),
        };

        if (editingOptionId) {
            setOptions(options.map(opt =>
                opt.id === editingOptionId
                    ? { ...opt, ...newOptionData }
                    : opt
            ));
        } else {
            setOptions([...options, {
                id: `temp-${Date.now()}-${Math.random()}`,
                ...newOptionData,
            } as MaterialOption]);
        }
        setCurrentOptionName('');
        setCurrentOptionDescription('');
        setEditingOptionId(null);
    };
    const handleEditOption = (option: MaterialOption) => { /* ... (same as before) ... */
        setEditingOptionId(option.id);
        setCurrentOptionName(option.name);
        setCurrentOptionDescription(option.description || '');
    };
    const handleDeleteOptionFromLocal = (optionId: string) => { /* ... (same as before) ... */
        setOptions(options.filter(opt => opt.id !== optionId));
        if (editingOptionId === optionId) {
            setCurrentOptionName('');
            setCurrentOptionDescription('');
            setEditingOptionId(null);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!name.trim()) {
            setFormError("Material name is required.");
            return;
        }

        const rateValue = parseFloat(defaultRate);

        setIsSaving(true);
        const materialDataToSave: Partial<CustomMaterial> = { // Use Partial for flexibility
            userId: userId,
            name: name.trim(),
            name_lowercase: name.trim().toLowerCase(),
            description: description.trim(),
            optionsAvailable: optionsAvailable,
            defaultUnit: defaultUnit.trim() || 'item', // Ensure a unit
            updatedAt: serverTimestamp() as Timestamp, // Cast for type safety
        };

        if (!isNaN(rateValue) && defaultRate.trim() !== '') { // Only include rate if it's a valid number
            materialDataToSave.defaultRate = rateValue;
        } else if (defaultRate.trim() === '') { // If user cleared the rate, explicitly set to null or remove
             materialDataToSave.defaultRate = undefined; // Or use delete if you want to remove the field
        } else {
            setFormError("Default Rate must be a valid number if provided.");
            setIsSaving(false);
            return;
        }


        try {
            let materialId = initialData?.id;

            if (mode === 'add') {
                const docRef = await addDoc(collection(db, `users/${userId}/customMaterials`), {
                    ...materialDataToSave,
                    createdAt: serverTimestamp() as Timestamp, // Cast for type safety
                });
                materialId = docRef.id;
            } else if (materialId) { // Edit mode
                const materialDocRef = doc(db, `users/${userId}/customMaterials`, materialId);
                await updateDoc(materialDocRef, materialDataToSave);
            }

            if (!materialId) throw new Error("Material ID is missing for options handling.");

            // Manage options subcollection (same logic as before)
            const optionsRef = collection(db, `users/${userId}/customMaterials/${materialId}/options`);
            const batch = writeBatch(db);
            if (mode === 'edit') {
                const existingOptionsSnapshot = await getDocs(optionsRef);
                existingOptionsSnapshot.forEach(optionDoc => batch.delete(optionDoc.ref));
            }
            if (optionsAvailable && options.length > 0) {
                options.forEach(option => {
                    const newOptionRef = doc(optionsRef);
                    const { id: tempId, createdAt: oldCreatedAt, updatedAt: oldUpdatedAt, ...optionDataForDb } = option;
                    batch.set(newOptionRef, {
                        ...optionDataForDb,
                        name_lowercase: option.name.toLowerCase(),
                        createdAt: serverTimestamp() as Timestamp,
                        updatedAt: serverTimestamp() as Timestamp,
                    });
                });
            }
            await batch.commit();
            await onSaveCallback();
        } catch (err: any) {
            console.error("Error saving material and options:", err);
            setFormError(`Failed to save material: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={modalStyles} onClick={onClose}>
            <div style={modalContentStyles} onClick={(e) => e.stopPropagation()}>
                <h3>{mode === 'add' ? 'Add New Custom Material' : 'Edit Custom Material'}</h3>
                <form onSubmit={handleSubmit}>
                    {/* Material Name */}
                    <div style={formGroupStyles}>
                        <label htmlFor="materialNameModal" style={labelStyles}>Material Name<span style={{color: 'red'}}>*</span>:</label>
                        <input type="text" id="materialNameModal" style={inputStyles} value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>

                    {/* === NEW: Default Rate and Unit === */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="materialDefaultRate" style={labelStyles}>Default Rate ($):</label>
                            <input
                                type="number"
                                id="materialDefaultRate"
                                style={inputStyles}
                                value={defaultRate}
                                onChange={(e) => setDefaultRate(e.target.value)}
                                placeholder="e.g., 15.50"
                                step="0.01" // Allows decimal input
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="materialDefaultUnit" style={labelStyles}>Default Unit:</label>
                            <input
                                type="text"
                                id="materialDefaultUnit"
                                style={inputStyles}
                                value={defaultUnit}
                                onChange={(e) => setDefaultUnit(e.target.value)}
                                placeholder="e.g., each, m, kg"
                                list="common-material-units-datalist"
                            />
                            <datalist id="common-material-units-datalist">
                                {COMMON_UNITS.map(unit => (
                                    <option key={unit} value={unit} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                    {/* === END NEW: Default Rate and Unit === */}

                    {/* Material Description */}
                    <div style={formGroupStyles}>
                        <label htmlFor="materialDescriptionModal" style={labelStyles}>Description:</label>
                        <textarea id="materialDescriptionModal" style={textareaStyles} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>

                    {/* Options Available Checkbox (same as before) */}
                    <div style={formGroupStyles}>
                        <label style={{ ...labelStyles, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input type="checkbox" checked={optionsAvailable} onChange={(e) => setOptionsAvailable(e.target.checked)} style={{ marginRight: '10px', height: '1.1em', width: '1.1em' }} />
                            Has Options (e.g., sizes, colors)
                        </label>
                    </div>

                    {/* Options Management Section (same as before) */}
                    {optionsAvailable && (
                        <div style={optionsSectionStyles}>
                            {/* ... (options management UI - same as the full version I provided previously) ... */}
                            <h4>Manage Options</h4>
                            {isLoadingOptions && <p>Loading options...</p>}
                            {optionsError && <p style={{ color: 'red' }}>{optionsError}</p>}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-end' }}>
                                <div style={{flexGrow: 1}}>
                                    <label htmlFor="optionNameModal" style={{...labelStyles, fontSize: '0.9em', marginBottom: '3px'}}>Option Name:</label>
                                    <input type="text" id="optionNameModal" placeholder="E.g., Large" style={optionInputStyles} value={currentOptionName} onChange={(e) => setCurrentOptionName(e.target.value)} />
                                </div>
                                <div style={{flexGrow: 1}}>
                                    <label htmlFor="optionDescModal" style={{...labelStyles, fontSize: '0.9em', marginBottom: '3px'}}>Option Description:</label>
                                     <input type="text" id="optionDescModal" placeholder="E.g., 1200x600mm" style={optionInputStyles} value={currentOptionDescription} onChange={(e) => setCurrentOptionDescription(e.target.value)} />
                                </div>
                                <button type="button" style={{...primaryButtonStyles, ...optionButtonStyles}} onClick={handleAddOrUpdateOption} disabled={isSaving}> {editingOptionId ? 'Update' : '+ Add'} </button>
                            </div>
                            {options.length > 0 && (
                                <ul style={{ listStyle: 'none', padding: 0, maxHeight: '150px', overflowY: 'auto' }}>
                                    {options.map((opt) => (
                                        <li key={opt.id} style={optionItemStyles}>
                                            <div><strong>{opt.name}</strong>{opt.description && <small style={{ display: 'block', color: '#555' }}>{opt.description}</small>}</div>
                                            <div style={{whiteSpace: 'nowrap'}}><button type="button" style={optionActionButtonStyles} onClick={() => handleEditOption(opt)} disabled={isSaving}>Edit</button><button type="button" style={optionDeleteButtonStyles} onClick={() => handleDeleteOptionFromLocal(opt.id)} disabled={isSaving}>Del</button></div>
                                        </li>))}
                                </ul>
                            )}
                             {options.length === 0 && !isLoadingOptions && <p style={{fontSize: '0.9em', color: '#666'}}>No options added yet for this material.</p>}
                        </div>
                    )}

                    {formError && <p style={{ color: 'red', marginTop: '15px', textAlign: 'center' }}>{formError}</p>}

                    <div style={buttonContainerStyles}>
                        <button type="button" style={secondaryButtonStyles} onClick={onClose} disabled={isSaving}>Cancel</button>
                        <button type="submit" style={primaryButtonStyles} disabled={isSaving}>
                            {isSaving ? 'Saving...' : (mode === 'add' ? 'Add Material' : 'Save Changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default MaterialFormModal;