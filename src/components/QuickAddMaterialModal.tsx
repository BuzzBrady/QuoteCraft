// src/components/QuickAddMaterialModal.tsx
import React, { useState, useEffect } from 'react';
import styles from './QuickAddMaterialModal.module.css'; 
import { MaterialOption } from '../types'; 
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/utils';

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
                <form onSubmit={handleSubmit} className={styles.materialFormContainer}>
                    <div className="form-group mb-md">
                        <label htmlFor="materialName">Material Name<span style={{color: 'var(--color-error)'}}>*</span>:</label>
                        <input type="text" id="materialName" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter material name" />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="materialDescription">Description:</label>
                        <textarea id="materialDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}></textarea>
                    </div>
                    <div className={`${styles.formGroupRow} mb-md`}>
                        <div className="form-group">
                            <label htmlFor="defaultRate">Default Rate ($):</label>
                            <input type="number" id="defaultRate" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} step="any" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="defaultUnit">Default Unit:</label>
                            <input type="text" id="defaultUnit" value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder="e.g. item" />
                        </div>
                    </div>
                    <div className="form-group mb-md">
                        <label className={styles.checkboxLabel}> {/* Retain styles.checkboxLabel for specific flex/alignment if needed */}
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
                                            <button type="button" onClick={() => handleRemoveTempOption(opt.id)} className="btn btn-danger btn-sm">Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            <button type="button" onClick={() => {setShowOptionSubForm(prev => !prev); setTempOption({...initialTempOptionData, id:uuidv4()});}} className="btn btn-secondary mb-sm">
                                {showOptionSubForm ? 'Hide Option Form' : '+ Add New Option'}
                            </button>

                            {showOptionSubForm && (
                                <div className={styles.optionSubForm}>
                                    <div className="form-group mb-sm">
                                        <label htmlFor="optionName">Option Name<span style={{color: 'var(--color-error)'}}>*</span>:</label>
                                        <input type="text" id="optionName" name="name" value={tempOption.name} onChange={handleTempOptionChange} />
                                    </div>
                                    <div className="form-group mb-sm">
                                        <label htmlFor="optionRateModifier">Rate Modifier ($):</label>
                                        <input type="number" id="optionRateModifier" name="rateModifier" value={tempOption.rateModifier} onChange={handleTempOptionChange} step="any" />
                                    </div>
                                    <div className="form-group mb-sm">
                                        <label htmlFor="optionDescription">Option Description:</label>
                                        <textarea id="optionDescription" name="description" value={tempOption.description} onChange={handleTempOptionChange} rows={2}></textarea>
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
