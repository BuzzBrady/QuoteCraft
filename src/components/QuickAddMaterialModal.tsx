// src/components/QuickAddMaterialModal.tsx
import React, { useState, useEffect } from 'react';
import styles from './QuickAddMaterialModal.module.css';
import { MaterialOption } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/utils'; // Assuming this path is correct

interface QuickAddMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        name: string;
        description: string;
        optionsAvailable: boolean;
        defaultRate?: number;
        defaultUnit?: string;
        options: MaterialOption[];
    }) => void;
    initialName?: string;
}

interface TempOptionData {
    id: string;
    name: string;
    description?: string;
    rateModifier?: number; // Keep as number for calculations
}

const initialTempOptionData: TempOptionData = {
    id: '', name: '', description: '', rateModifier: 0,
};

function QuickAddMaterialModal({ isOpen, onClose, onSave, initialName = '' }: QuickAddMaterialModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [optionsAvailable, setOptionsAvailable] = useState(false);
    const [defaultRate, setDefaultRate] = useState<string>(''); // Keep as string for input field
    const [defaultUnit, setDefaultUnit] = useState<string>('item');
    
    const [currentOptions, setCurrentOptions] = useState<MaterialOption[]>([]);
    const [showOptionSubForm, setShowOptionSubForm] = useState(false);
    const [tempOption, setTempOption] = useState<TempOptionData>(initialTempOptionData);

    // --- FIX FOR BODY SCROLL ---
    useEffect(() => {
        if (isOpen) {
            // When modal opens, disable body scroll
            document.body.style.overflow = 'hidden';
        } else {
            // When modal closes, re-enable body scroll
            document.body.style.overflow = 'auto'; // Or 'visible' or original value
        }

        // Cleanup function to ensure scroll is re-enabled when component unmounts while open
        return () => {
            document.body.style.overflow = 'auto'; // Or 'visible' or original value
        };
    }, [isOpen]); // Effect runs when 'isOpen' changes
    // --- END OF FIX FOR BODY SCROLL ---

    useEffect(() => {
        if (isOpen) {
            setName(initialName || ''); // Ensure initialName is used or fallback to empty
            setDescription('');
            setOptionsAvailable(false);
            setDefaultRate('');
            setDefaultUnit('item');
            setCurrentOptions([]);
            setShowOptionSubForm(false);
            setTempOption({...initialTempOptionData, id: uuidv4()}); // Give new tempOption an ID
        }
    }, [isOpen, initialName]);

    const handleOptionsAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOptionsAvailable(e.target.checked);
        if (!e.target.checked) {
            setCurrentOptions([]); 
            setShowOptionSubForm(false);
        } else {
            // Optionally show the form immediately if "Has Options" is checked
            // and there are no options yet.
            if (currentOptions.length === 0) {
                setShowOptionSubForm(true);
                setTempOption({...initialTempOptionData, id: uuidv4()});
            }
        }
    };

    const handleTempOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name: fieldName, value } = e.target;
        setTempOption(prev => ({
            ...prev,
            // For rateModifier, store as number if valid, otherwise keep previous or 0
            [fieldName]: fieldName === 'rateModifier' ? (value === '' ? '' : parseFloat(value)) : value,
        }));
    };

    const handleAddTempOption = () => {
        if (!tempOption.name.trim()) {
            alert("Option name cannot be empty.");
            return;
        }
        const rateModifierValue = typeof tempOption.rateModifier === 'string' 
                                  ? parseFloat(tempOption.rateModifier) 
                                  : tempOption.rateModifier;

        const newOption: MaterialOption = {
            id: tempOption.id || uuidv4(), 
            name: tempOption.name.trim(),
            name_lowercase: tempOption.name.trim().toLowerCase(),
            description: tempOption.description?.trim() || undefined, // Ensure empty string becomes undefined
            rateModifier: !isNaN(rateModifierValue as number) ? rateModifierValue : 0, 
        };
        setCurrentOptions(prev => {
            const existingIndex = prev.findIndex(opt => opt.id === newOption.id);
            if (existingIndex > -1) { // Editing existing temp option (though this UI doesn't explicitly support editing from list yet)
                const updated = [...prev];
                updated[existingIndex] = newOption;
                return updated;
            }
            return [...prev, newOption];
        });
        setTempOption({...initialTempOptionData, id: uuidv4()}); // Reset for next option
        // Keep the sub-form open to add more options easily
        setShowOptionSubForm(true); 
    };
    
    const handleRemoveTempOption = (optionIdToRemove: string) => {
        setCurrentOptions(prev => prev.filter(opt => opt.id !== optionIdToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Material name is required.");
            return;
        }
        onSave({
            name: name.trim(),
            description: description.trim(),
            optionsAvailable,
            defaultRate: defaultRate ? parseFloat(defaultRate) : undefined,
            defaultUnit: defaultUnit.trim() || 'item',
            options: currentOptions, 
        });
        // onClose(); // Usually onSave in parent will trigger onClose
    };

    if (!isOpen) return null;

    return (
        // Add onClick={onClose} to overlay for closing by clicking outside
        <div className={styles.modalOverlay} onClick={onClose}> 
            {/* Add e.stopPropagation() to prevent closing when clicking inside modal content */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> 
                <h2 className={styles.modalTitle}>Quick Add New Material</h2>
                <form onSubmit={handleSubmit} className={styles.materialFormContainer}>
                    <div className="form-group mb-md"> {/* Assuming global 'form-group' and 'mb-md' or use styles.* */}
                        <label htmlFor="qam-materialName">Material Name<span style={{color: 'var(--color-error)'}}>*</span>:</label>
                        <input type="text" id="qam-materialName" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter material name" />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="qam-materialDescription">Description:</label>
                        <textarea id="qam-materialDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}></textarea>
                    </div>
                    <div className={`${styles.formGroupRow} mb-md`}>
                        <div className="form-group">
                            <label htmlFor="qam-defaultRate">Default Rate ($):</label>
                            <input type="number" id="qam-defaultRate" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} step="any" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="qam-defaultUnit">Default Unit:</label>
                            <input type="text" id="qam-defaultUnit" value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder="e.g. item" />
                        </div>
                    </div>
                    <div className="form-group mb-md">
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" checked={optionsAvailable} onChange={handleOptionsAvailableChange} />
                            Has Options?
                        </label>
                    </div>

                    {optionsAvailable && (
                        <div className={styles.optionsSection}>
                            <h4 className={styles.optionsTitle}>Manage Options</h4>
                            {currentOptions.length > 0 && (
                                <ul className={styles.optionsListPreview}>
                                    {currentOptions.map((opt) => (
                                        <li key={opt.id} className={styles.optionPreviewItem}>
                                            <span>{opt.name} {opt.rateModifier ? `(${opt.rateModifier >=0 ? '+' : ''}${formatCurrency(opt.rateModifier)})` : ''}</span>
                                            {/* Consider adding an edit button here later if needed */}
                                            <button type="button" onClick={() => handleRemoveTempOption(opt.id)} className="btn btn-danger btn-sm">Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowOptionSubForm(prev => !prev); 
                                    // Reset tempOption only when showing the form to start fresh
                                    if (!showOptionSubForm) {
                                        setTempOption({...initialTempOptionData, id:uuidv4()});
                                    }
                                }} 
                                className="btn btn-secondary mb-sm"
                            >
                                {showOptionSubForm ? 'Hide Option Form' : '+ Add New Option'}
                            </button>

                            {showOptionSubForm && (
                                <div className={styles.optionSubForm}>
                                    <div className="form-group mb-sm">
                                        <label htmlFor="qam-optionName">Option Name<span style={{color: 'var(--color-error)'}}>*</span>:</label>
                                        <input type="text" id="qam-optionName" name="name" value={tempOption.name} onChange={handleTempOptionChange} />
                                    </div>
                                    <div className="form-group mb-sm">
                                        <label htmlFor="qam-optionRateModifier">Rate Modifier ($):</label>
                                        <input 
                                            type="number" 
                                            id="qam-optionRateModifier" 
                                            name="rateModifier" 
                                            value={tempOption.rateModifier === undefined || tempOption.rateModifier === null || isNaN(tempOption.rateModifier as number) ? '' : tempOption.rateModifier} // Handle number correctly
                                            onChange={handleTempOptionChange} 
                                            step="any" 
                                        />
                                    </div>
                                    <div className="form-group mb-sm">
                                        <label htmlFor="qam-optionDescription">Option Description:</label>
                                        <textarea id="qam-optionDescription" name="description" value={tempOption.description || ''} onChange={handleTempOptionChange} rows={2}></textarea>
                                    </div>
                                    <button type="button" onClick={handleAddTempOption} className="btn btn-primary w-100">Add Option to List</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`${styles.buttonGroup} mt-lg`}>
                        <button type="submit" className="btn btn-accent">Save Material</button>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default QuickAddMaterialModal;