// src/components/RateTemplateFormModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import styles from './RateTemplateFormModal.module.css';
import { UserRateTemplate, CombinedTask, CombinedMaterial, MaterialOption } from '../types';

// Import your selector components
import TaskSelector from './TaskSelector';
import MaterialSelector from './MaterialSelector';
import MaterialOptionSelector from './MaterialOptionSelector';

interface RateTemplateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rateData: any) => Promise<void>;
    initialData?: UserRateTemplate | null;
    mode: 'add' | 'edit';
    allTasks: CombinedTask[];
    allMaterials: CombinedMaterial[];
}

function RateTemplateFormModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    mode,
    allTasks,
    allMaterials
}: RateTemplateFormModalProps) {

    // Form State
    const [displayName, setDisplayName] = useState('');
    const [referenceRate, setReferenceRate] = useState('');
    const [unit, setUnit] = useState('item');
    const [selectedTask, setSelectedTask] = useState<CombinedTask | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<CombinedMaterial | null>(null);
    const [selectedOption, setSelectedOption] = useState<MaterialOption | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Effect to lock body scroll
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalOverflow;
        }
        return () => { document.body.style.overflow = originalOverflow; };
    }, [isOpen]);

    // Effect to populate form when modal opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            setFormError(null);
            if (mode === 'edit' && initialData) {
                setDisplayName(initialData.displayName || '');
                setReferenceRate(initialData.referenceRate?.toString() || '');
                setUnit(initialData.unit || 'item');
                // Pre-select task, material, and option based on IDs using the props
                setSelectedTask(allTasks.find(t => t.id === initialData.taskId) || null);
                setSelectedMaterial(allMaterials.find(m => m.id === initialData.materialId) || null);
                // The MaterialOptionSelector will handle pre-selecting the option via its prop
            } else { // Reset form for 'add' mode
                setDisplayName('');
                setReferenceRate('');
                setUnit('item');
                setSelectedTask(null);
                setSelectedMaterial(null);
                setSelectedOption(null);
            }
        }
    }, [isOpen, mode, initialData, allTasks, allMaterials]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) {
            setFormError("Display Name is required.");
            return;
        }
        if (!referenceRate.trim()) {
            setFormError("Rate is required.");
            return;
        }
        setIsSaving(true);
        setFormError(null);

        // Build the rateData object to save
        const rateData = {
            displayName: displayName.trim(),
            displayName_lowercase: displayName.trim().toLowerCase(),
            referenceRate: parseFloat(referenceRate) || 0,
            unit: unit.trim() || 'item',
            taskId: selectedTask?.id || null,
            taskName: selectedTask?.name || null,
            materialId: selectedMaterial?.id || null,
            materialName: selectedMaterial?.name || null,
            materialOptionId: selectedOption?.id || null,
            materialOptionName: selectedOption?.name || null,
            inputType: 'quantity', // This can be a form field if you need more types
        };
        
        try {
            await onSave(rateData);
        } catch (error) {
            console.error("onSave callback failed", error);
            // Parent component's error handling will be triggered
        } finally {
            setIsSaving(false);
        }
    };

    // Placeholder handlers to satisfy the selector props
    const handleCreateCustomTask = (): Promise<CombinedTask | null> => {
        alert(`To add a new task, please go to the "Manage My Library" page.`);
        return Promise.resolve(null);
    };

    const handleCreateCustomMaterial = (): Promise<CombinedMaterial | null> => {
        alert(`To add a new material, please go to the "Manage My Library" page.`);
        return Promise.resolve(null);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{mode === 'add' ? 'Add New Rate Template' : 'Edit Rate Template'}</h2>
                    <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">&times;</button>
                </div>
                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit} id="rate-template-form" className={styles.formContainer}>
                        <div className="form-group">
                            <label htmlFor="displayName">Display Name*:</label>
                            <input type="text" id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="e.g., Standard Labor Rate" />
                        </div>
                        <div className={styles.formRow}>
                            <div className="form-group">
                                <label htmlFor="referenceRate">Rate ($)*:</label>
                                <input type="number" id="referenceRate" value={referenceRate} onChange={e => setReferenceRate(e.target.value)} required step="0.01" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="unit">Unit*:</label>
                                <input type="text" id="unit" value={unit} onChange={e => setUnit(e.target.value)} required />
                            </div>
                        </div>
                        <p className={styles.associationHelp}>Associate this rate with a specific task and/or material (optional).</p>
                        <div className="form-group">
                            <label>Associated Task:</label>
                            <TaskSelector
                                allTasks={allTasks}
                                onSelect={setSelectedTask}
                                isLoading={false} // Loading is handled by the parent page
                                userId={currentUser?.uid || ""}
                                onCreateCustomTask={handleCreateCustomTask}
                            />
                        </div>
                        <div className="form-group">
                            <label>Associated Material:</label>
                            <MaterialSelector
                                allMaterials={allMaterials}
                                onSelect={setSelectedMaterial}
                                isLoading={false} // Loading is handled by the parent page
                                userId={currentUser?.uid || ""}
                                onCreateCustomMaterial={handleCreateCustomMaterial}
                            />
                        </div>
                        {selectedMaterial?.optionsAvailable && (
                            <div className="form-group">
                                <label>Material Option:</label>
                                <MaterialOptionSelector
                                    selectedMaterial={selectedMaterial}
                                    onSelect={setSelectedOption}
                                    initialSelectedOptionId={initialData?.materialOptionId || null}
                                />
                            </div>
                        )}
                        {formError && <p className={styles.errorMessage}>{formError}</p>}
                    </form>
                </div>
                <div className={styles.modalFooter}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
                    <button type="submit" form="rate-template-form" className="btn btn-accent" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Rate'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RateTemplateFormModal;