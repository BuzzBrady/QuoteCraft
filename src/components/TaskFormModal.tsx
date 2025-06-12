// src/components/TaskFormModal.tsx
import { useState, useEffect, FormEvent } from 'react';
import styles from './TaskFormModal.module.css'; // This will now style the entire modal
import { Task } from '../types';

// Common units for the datalist helper
const COMMON_TASK_UNITS = [
    "item", "hour", "day", "job", "m²", "m³", "lm", "visit", "allowance", "supply", "install"
];

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    // The onSave prop now includes the optional taskRate
    onSave: (taskData: { name: string; defaultUnit: string; description: string; taskRate?: number }) => Promise<void> | void;
    initialData?: Partial<Task> | null;
    mode: 'add' | 'edit';
}

function TaskFormModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    mode,
}: TaskFormModalProps) {
    const [name, setName] = useState('');
    const [defaultUnit, setDefaultUnit] = useState('');
    const [description, setDescription] = useState('');
    const [taskRate, setTaskRate] = useState<string>(''); // For the input field

    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // This useEffect handles body scroll lock and is essential
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalOverflow;
        }
        return () => { // Cleanup function on unmount
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // This useEffect resets the form state when the modal opens
    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            setFormError(null);
            if (mode === 'edit' && initialData) {
                setName(initialData.name || '');
                setDefaultUnit(initialData.defaultUnit || 'item');
                setDescription(initialData.description || '');
                setTaskRate(initialData.taskRate?.toString() || ''); // Use taskRate
            } else { // 'add' mode
                setName(initialData?.name || '');
                setDefaultUnit(initialData?.defaultUnit || 'item');
                setDescription(initialData?.description || '');
                setTaskRate(initialData?.taskRate?.toString() || '');
            }
        }
    }, [isOpen, mode, initialData]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setFormError("Task name is required.");
            return;
        }
        setIsSaving(true);
        setFormError(null);

        const rate = parseFloat(taskRate);
        const taskDataToSave = {
            name: name.trim(),
            defaultUnit: defaultUnit.trim() || 'item',
            description: description.trim(),
            taskRate: taskRate.trim() !== '' && !isNaN(rate) ? rate : undefined,
        };

        try {
            await onSave(taskDataToSave);
            // The onSave function (in the parent) is now responsible for closing the modal
        } catch (err: any) {
            console.error("Error saving task:", err);
            setFormError(err.message || "Failed to save task. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        {mode === 'add' ? 'Add New Custom Task' : 'Edit Custom Task'}
                    </h2>
                    <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">&times;</button>
                </div>

                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit} id="task-form" className={styles.taskFormContainer}>
                        <div className="form-group">
                        <label htmlFor="taskFormNameInput" className={styles.labelWithHelp}>
        <span>Task Name<span style={{color: 'var(--color-error)'}}>*</span></span>
        
        {/* --- NEW HELP ICON & TOOLTIP STRUCTURE --- */}
        <div className={styles.tooltipContainer}>
            <span className={styles.helpIcon}>?</span>
            <div className={styles.tooltip}>
                A Task represents a service or action, like 'Labor', 'Site Visit', 'Arrange Delivery', or 'Supply and Install'. You can add an optional rate to tasks like 'Labor'.
            </div>
        </div>
        {/* --- END OF NEW STRUCTURE --- */}

    </label>
    <input
        type="text"
        id="taskFormNameInput"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        placeholder="e.g., Service or Action" // Using your simplified placeholder
    />
</div>

<div className={styles.formRow}>
    <div className="form-group">
        <label htmlFor="taskFormTaskRate">Task Rate ($) (Optional):</label>
        <input
            type="number" // Use type="number" for rates
            id="taskFormTaskRate" // Correct ID
            value={taskRate} // Use the 'taskRate' state variable
            onChange={(e) => setTaskRate(e.target.value)} // Use the correct state setter 'setTaskRate'
            placeholder="e.g., 75.00"
            step="0.01" // Allows decimal values
            // 'required' is removed as this field is optional
            // 'autoFocus' should be on the first input of the form (Task Name), not here
        />
    </div>
    <div className="form-group">
        <label htmlFor="taskFormDefaultUnit">Default Unit:</label>
        <input
            type="text"
            id="taskFormDefaultUnit"
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
            placeholder="e.g., hour, item, m²"
            list="common-task-units-datalist"
        />
        <datalist id="common-task-units-datalist">
            {COMMON_TASK_UNITS.map(unit => (<option key={unit} value={unit} />))}
        </datalist>
    </div>
</div>

                        <div className="form-group">
                            <label htmlFor="taskFormDescription">Description:</label>
                            <textarea
                                id="taskFormDescription"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4} // Increased rows for more space
                                placeholder="Optional: Describe what this task usually involves"
                            />
                        </div>
                        {formError && <p className={styles.errorMessage}>{formError}</p>}
                    </form>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="submit" form="task-form" className="btn btn-accent" disabled={isSaving}>
                        {isSaving ? 'Saving...' : (mode === 'add' ? 'Add Task' : 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TaskFormModal;