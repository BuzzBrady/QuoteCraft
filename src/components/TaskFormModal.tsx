// src/components/TaskFormModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { CustomTask } from '../types';
import GenericFormModal from './GenericFormModal'; // Import the generic modal
import styles from './TaskFormModal.module.css';   // Import specific styles for this form

// Define common units (can be moved to a constants file if used elsewhere)
const COMMON_UNITS = [
    "item", "each", "hour", "day", "week",
    "m", "m²", "m³", "lm",
    "kg", "tonne",
    "L", "point", "visit", "lot",
    "allowance", "service", "supply", "install", "unit", "job", "report"
];

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskData: { name: string; defaultUnit: string; description: string }) => void;
    initialData?: CustomTask | null;
    mode: 'add' | 'edit';
}

function TaskFormModal({ isOpen, onClose, onSave, initialData, mode }: TaskFormModalProps) {
    const [name, setName] = useState<string>('');
    const [defaultUnit, setDefaultUnit] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false); // Added for button state

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            setIsSaving(false);
            if (mode === 'edit' && initialData) {
                setName(initialData.name || '');
                setDefaultUnit(initialData.defaultUnit || 'item');
                setDescription(initialData.description || '');
            } else {
                setName('');
                setDefaultUnit('item'); // Default for new tasks
                setDescription('');
            }
        }
    }, [isOpen, mode, initialData]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!name.trim()) {
            setFormError("Task name is required.");
            return;
        }
        setIsSaving(true);
        try {
            await onSave({ // Assuming onSave might be async
                name: name.trim(),
                defaultUnit: defaultUnit.trim() || 'item',
                description: description.trim(),
            });
            // onClose will be called by the parent (CustomTasksManager) after successful save
        } catch (error) {
            console.error("Error in TaskFormModal onSave:", error);
            setFormError("Failed to save task. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const footerContent = (
        <>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSaving}>
                Cancel
            </button>
            <button type="submit" form="task-form" className={styles.primaryButton} disabled={isSaving}>
                {isSaving ? 'Saving...' : (mode === 'add' ? 'Add Task' : 'Save Changes')}
            </button>
        </>
    );

    return (
        <GenericFormModal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'add' ? 'Add New Custom Task' : 'Edit Custom Task'}
            footerContent={footerContent}
        >
            <form onSubmit={handleSubmit} id="task-form">
                <div className={styles.formGroup}>
                    <label htmlFor="taskName" className={styles.label}>Task Name<span style={{color: 'red'}}>*</span>:</label>
                    <input
                        type="text"
                        id="taskName"
                        className={styles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="defaultUnit" className={styles.label}>Default Unit:</label>
                    <input
                        type="text"
                        id="defaultUnit"
                        className={styles.input}
                        value={defaultUnit}
                        onChange={(e) => setDefaultUnit(e.target.value)}
                        placeholder="e.g., item, hour, m², kg"
                        list="common-task-units-datalist"
                    />
                    <datalist id="common-task-units-datalist">
                        {COMMON_UNITS.map(unit => (
                            <option key={unit} value={unit} />
                        ))}
                    </datalist>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="description" className={styles.label}>Description:</label>
                    <textarea
                        id="description"
                        className={styles.textarea}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                {formError && <p className={styles.errorMessage}>{formError}</p>}
            </form>
        </GenericFormModal>
    );
}

export default TaskFormModal;
