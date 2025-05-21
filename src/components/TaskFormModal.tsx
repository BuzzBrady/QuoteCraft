// src/components/TaskFormModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { CustomTask } from '../types';

// Define common units (can be moved to a constants file if used elsewhere)
const COMMON_UNITS = [
    "item", "each", "hour", "day", "week",
    "m", "m²", "m³", // meter, square meter, cubic meter
    "lm", // linear meter
    "kg", "tonne",
    "L", // liter
    "point", "visit", "lot",
    "allowance", "service", "supply", "install", "unit", "job", "report"
];

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskData: { name: string; defaultUnit: string; description: string }) => void;
    initialData?: CustomTask | null;
    mode: 'add' | 'edit';
}

// Basic modal styling (ensure these are defined or imported)
const modalStyles: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalContentStyles: React.CSSProperties = {
    backgroundColor: '#fff', padding: '20px 30px', borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)', width: '90%', maxWidth: '500px',
};
const formGroupStyles: React.CSSProperties = { marginBottom: '15px' };
const labelStyles: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
const inputStyles: React.CSSProperties = {
    width: '100%', padding: '8px', border: '1px solid #ccc',
    borderRadius: '4px', boxSizing: 'border-box',
};
const textareaStyles: React.CSSProperties = { ...inputStyles, minHeight: '80px', resize: 'vertical' };
const buttonContainerStyles: React.CSSProperties = { marginTop: '20px', textAlign: 'right' };
const buttonStyles: React.CSSProperties = {
    padding: '10px 15px', marginLeft: '10px', border: 'none',
    borderRadius: '4px', cursor: 'pointer',
};
const primaryButtonStyles: React.CSSProperties = { ...buttonStyles, backgroundColor: '#007bff', color: 'white' };
const secondaryButtonStyles: React.CSSProperties = { ...buttonStyles, backgroundColor: '#6c757d', color: 'white' };


function TaskFormModal({ isOpen, onClose, onSave, initialData, mode }: TaskFormModalProps) {
    const [name, setName] = useState<string>('');
    const [defaultUnit, setDefaultUnit] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
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

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!name.trim()) {
            setFormError("Task name is required.");
            return;
        }

        onSave({
            name: name.trim(),
            defaultUnit: defaultUnit.trim() || 'item', // Ensure a value, default to 'item' if empty
            description: description.trim(),
        });
    };

    if (!isOpen) return null;

    return (
        <div style={modalStyles} onClick={onClose}>
            <div style={modalContentStyles} onClick={(e) => e.stopPropagation()}>
                <h3>{mode === 'add' ? 'Add New Custom Task' : 'Edit Custom Task'}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={formGroupStyles}>
                        <label htmlFor="taskName" style={labelStyles}>Task Name<span style={{color: 'red'}}>*</span>:</label>
                        <input
                            type="text"
                            id="taskName"
                            style={inputStyles}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div style={formGroupStyles}>
                        <label htmlFor="defaultUnit" style={labelStyles}>Default Unit:</label>
                        <input
                            type="text"
                            id="defaultUnit"
                            style={inputStyles}
                            value={defaultUnit}
                            onChange={(e) => setDefaultUnit(e.target.value)}
                            placeholder="e.g., item, hour, m², kg"
                            list="common-units-datalist" // Link to datalist
                        />
                        <datalist id="common-units-datalist">
                            {COMMON_UNITS.map(unit => (
                                <option key={unit} value={unit} />
                            ))}
                        </datalist>
                    </div>
                    <div style={formGroupStyles}>
                        <label htmlFor="description" style={labelStyles}>Description:</label>
                        <textarea
                            id="description"
                            style={textareaStyles}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {formError && <p style={{ color: 'red', marginTop: '10px' }}>{formError}</p>}

                    <div style={buttonContainerStyles}>
                        <button type="button" style={secondaryButtonStyles} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" style={primaryButtonStyles}>
                            {mode === 'add' ? 'Add Task' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TaskFormModal;