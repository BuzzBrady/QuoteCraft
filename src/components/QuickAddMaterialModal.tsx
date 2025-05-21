// src/components/QuickAddMaterialModal.tsx
// Modal for quickly adding a new custom material, now with option management.
// Imported formatCurrency utility.

import React, { useState, useEffect } from 'react';
import styles from './QuickAddMaterialModal.module.css'; 
import { MaterialOption } from '../types'; 
import { v4 as uuidv4 } from 'uuid';

// --- IMPORT SHARED UTILITY ---
import { formatCurrency } from '../utils/utils'; // Adjust path if your utils.ts is elsewhere

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
    rateModifier?: number;
}

const initialTempOptionData: TempOptionData = {
    id: '', name: '', description: '', rateModifier: 0,
};

function QuickAddMaterialModal({ isOpen, onClose, onSave, initialName = '' }: QuickAddMaterialModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [optionsAvailable, setOptionsAvailable] = useState(false);
    const [defaultRate, setDefaultRate] = useState<string>('');
    const [defaultUnit, setDefaultUnit] = useState<string>('item');
    
    const [currentOptions, setCurrentOptions] = useState<MaterialOption[]>([]);
    const [showOptionSubForm, setShowOptionSubForm] = useState(false);
    const [tempOption, setTempOption] = useState<TempOptionData>(initialTempOptionData);

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setDescription('');
            setOptionsAvailable(false);
            setDefaultRate('');
            setDefaultUnit('item');
            setCurrentOptions([]);
            setShowOptionSubForm(false);
            setTempOption(initialTempOptionData);
        }
    }, [isOpen, initialName]);

    const handleOptionsAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOptionsAvailable(e.target.checked);
        if (!e.target.checked) {
            setCurrentOptions([]); 
            setShowOptionSubForm(false);
        }
    };

    const handleTempOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name: fieldName, value } = e.target;
        setTempOption(prev => ({
            ...prev,
            [fieldName]: fieldName === 'rateModifier' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleAddTempOption = () => {
        if (!tempOption.name.trim()) {
            alert("Option name cannot be empty.");
            return;
        }
        const newOption: MaterialOption = {
            id: tempOption.id || uuidv4(), 
            name: tempOption.name.trim(),
            name_lowercase: tempOption.name.trim().toLowerCase(),
            description: tempOption.description?.trim() || undefined,
            rateModifier: tempOption.rateModifier || 0, 
        };
        setCurrentOptions(prev => [...prev, newOption]);
        setTempOption({...initialTempOptionData, id: uuidv4()}); 
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
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Quick Add New Material</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="materialName" className={styles.label}>Material Name*:</label>
                        <input type="text" id="materialName" value={name} onChange={(e) => setName(e.target.value)} required className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="materialDescription" className={styles.label}>Description:</label>
                        <textarea id="materialDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={styles.textarea}></textarea>
                    </div>
                    <div className={styles.formGroupRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="defaultRate" className={styles.label}>Default Rate ($):</label>
                            <input type="number" id="defaultRate" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} step="any" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="defaultUnit" className={styles.label}>Default Unit:</label>
                            <input type="text" id="defaultUnit" value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} className={styles.input} />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
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
                                    {currentOptions.map((opt) => ( // Removed index as opt.id is unique client-side
                                        <li key={opt.id} className={styles.optionPreviewItem}>
                                            <span>{opt.name} {opt.rateModifier ? `(${opt.rateModifier >=0 ? '+' : ''}${formatCurrency(opt.rateModifier)})` : ''}</span>
                                            <button type="button" onClick={() => handleRemoveTempOption(opt.id)} className={styles.removeOptionButton}>Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            <button type="button" onClick={() => {setShowOptionSubForm(prev => !prev); setTempOption({...initialTempOptionData, id:uuidv4()});}} className={styles.toggleOptionFormButton}>
                                {showOptionSubForm ? 'Hide Option Form' : '+ Add New Option'}
                            </button>

                            {showOptionSubForm && (
                                <div className={styles.optionSubForm}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="optionName" className={styles.label}>Option Name*:</label>
                                        <input type="text" id="optionName" name="name" value={tempOption.name} onChange={handleTempOptionChange} className={styles.input} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="optionRateModifier" className={styles.label}>Rate Modifier ($):</label>
                                        <input type="number" id="optionRateModifier" name="rateModifier" value={tempOption.rateModifier} onChange={handleTempOptionChange} step="any" className={styles.input} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="optionDescription" className={styles.label}>Option Description:</label>
                                        <textarea id="optionDescription" name="description" value={tempOption.description} onChange={handleTempOptionChange} rows={2} className={styles.textarea}></textarea>
                                    </div>
                                    <button type="button" onClick={handleAddTempOption} className={styles.addOptionButton}>Add Option to List</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.saveButton}>Save Material</button>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default QuickAddMaterialModal;
