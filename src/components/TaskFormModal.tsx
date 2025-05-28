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
    const [isSaving, setIsSaving] = useState(false);

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
                setDefaultUnit('item');
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
        } catch (error) {
            console.error("Error in TaskFormModal onSave:", error);
            setFormError("Failed to save task. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const footerContent = (
        <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
            </button>
            <button type="submit" form="task-form" className="btn btn-accent" disabled={isSaving}>
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
            <form onSubmit={handleSubmit} id="task-form" className={styles.taskFormContainer}>
                <div className="form-group mb-md"> {/* Using global form-group and margin utility */}
                    <label htmlFor="taskName">Task Name<span style={{color: 'var(--color-error)'}}>*</span>:</label> {/* Label styled globally, color from var */}
                    <input
                        type="text"
                        id="taskName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                        placeholder="Enter task name"
                    /> {/* Input styled globally */}
                </div>
                <div className="form-group mb-md">
                    <label htmlFor="defaultUnit">Default Unit:</label>
                    <input
                        type="text"
                        id="defaultUnit"
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
                <div className="form-group mb-md">
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3} /* Example: control height */
                    /> {/* Textarea styled globally */}
                </div>
                {formError && <p className="text-danger mt-sm">{formError}</p>} {/* Using global text-danger and margin utility */}
            </form>
        </GenericFormModal>
    );
}

export default TaskFormModal;
