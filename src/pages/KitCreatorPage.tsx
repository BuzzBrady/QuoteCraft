// src/pages/KitCreatorPage.tsx

import React, { useState } from 'react';
import { db } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUserCollection } from '../hooks/useUserCollection';
import { KitTemplate, CombinedTask, CombinedMaterial } from '../types';

import TaskSelector from '../components/TaskSelector';
import MaterialSelector from '../components/MaterialSelector';
import AreaMultiSelector from '../components/AreaMultiSelector'; // Assuming this component is set up for multi-selection
import styles from './KitCreatorPage.module.css';

const KitCreatorPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { data: userKits, isLoading: kitsLoading, refetch: refetchKits } = useUserCollection<KitTemplate>('kits', 'name');

    // State for the kit being built
    const [kitName, setKitName] = useState('');
    const [kitDescription, setKitDescription] = useState('');
    const [kitTasks, setKitTasks] = useState<CombinedTask[]>([]);
    const [kitMaterials, setKitMaterials] = useState<CombinedMaterial[]>([]);
    const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
    
    // State for the current selections from dropdowns
    const [currentTask, setCurrentTask] = useState<CombinedTask | null>(null);
    const [currentMaterial, setCurrentMaterial] = useState<CombinedMaterial | null>(null);

    const resetForm = () => {
        setKitName('');
        setKitDescription('');
        setKitTasks([]);
        setKitMaterials([]);
        setSelectedAreaIds([]);
        setCurrentTask(null);
        setCurrentMaterial(null);
    };

    const handleAddTask = () => {
        if (currentTask && !kitTasks.find(t => t.id === currentTask.id)) {
            setKitTasks([...kitTasks, currentTask]);
        }
        setCurrentTask(null); // Reset selector after adding
    };

    const handleAddMaterial = () => {
        if (currentMaterial && !kitMaterials.find(m => m.id === currentMaterial.id)) {
            setKitMaterials([...kitMaterials, currentMaterial]);
        }
        setCurrentMaterial(null); // Reset selector after adding
    };

    const handleSaveKit = async () => {
        if (!kitName.trim() || !currentUser) {
            alert('Please provide a kit name.');
            return;
        }

        const newKit = {
            name: kitName.trim(),
            description: kitDescription.trim(),
            taskIds: kitTasks.map(t => t.id),
            materialIds: kitMaterials.map(m => m.id),
            areaIds: selectedAreaIds,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'kits'), newKit);
            alert('Kit saved successfully!');
            refetchKits();
            resetForm();
        } catch (error) {
            console.error("Error saving kit: ", error);
            alert('Failed to save kit.');
        }
    };

    // Dummy handlers for custom item creation, as they are required by the selectors
    const handleCreateCustomTask = async (name: string) => {
      alert(`Creating custom items from here is not implemented yet. Please create "${name}" from the Library page.`);
      return null;
    };
    const handleCreateCustomMaterial = async (name: string) => {
      alert(`Creating custom items from here is not implemented yet. Please create "${name}" from the Library page.`);
      return null;
    };


    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Create a New Kit</h1>
                <button onClick={handleSaveKit} className="button-primary">Save Kit</button>
            </header>

            <div className={styles.formGrid}>
                {/* Kit Details */}
                <div className={styles.kitDetailsSection}>
                    <input
                        type="text"
                        value={kitName}
                        onChange={(e) => setKitName(e.target.value)}
                        placeholder="Kit Name (e.g., 'Standard Bathroom Fit-out')"
                        className={styles.inputField}
                    />
                    <textarea
                        value={kitDescription}
                        onChange={(e) => setKitDescription(e.target.value)}
                        placeholder="A brief description of what this kit includes."
                        className={styles.textareaField}
                    />
                    <div>
                        <label>Applicable Areas (Optional)</label>
                        <AreaMultiSelector onSelectionChange={setSelectedAreaIds} />
                    </div>
                </div>

                {/* Item Selection */}
                <div className={styles.itemSelectionSection}>
                    <div className={styles.selectorGroup}>
                        <TaskSelector
                            onSelect={setCurrentTask}
                            onCreateCustomTask={handleCreateCustomTask}
                        />
                        <button onClick={handleAddTask} disabled={!currentTask}>Add Task</button>
                    </div>

                    <div className={styles.selectorGroup}>
                        <MaterialSelector
                            onSelect={setCurrentMaterial}
                            onCreateCustomMaterial={handleCreateCustomMaterial}
                        />
                        <button onClick={handleAddMaterial} disabled={!currentMaterial}>Add Material</button>
                    </div>
                </div>

                {/* Kit Contents Preview */}
                <div className={styles.kitContentsSection}>
                    <h4>Kit Contents</h4>
                    <div className={styles.contentsList}>
                        <h5>Tasks</h5>
                        <ul>
                            {kitTasks.map(task => (
                                <li key={task.id}>
                                    {task.name}
                                    <button onClick={() => setKitTasks(kitTasks.filter(t => t.id !== task.id))} className={styles.removeButton}>X</button>
                                </li>
                            ))}
                            {kitTasks.length === 0 && <p className={styles.emptyListText}>No tasks added.</p>}
                        </ul>
                    </div>
                    <div className={styles.contentsList}>
                        <h5>Materials</h5>
                        <ul>
                            {kitMaterials.map(material => (
                                <li key={material.id}>
                                    {material.name}
                                    <button onClick={() => setKitMaterials(kitMaterials.filter(m => m.id !== material.id))} className={styles.removeButton}>X</button>
                                </li>
                            ))}
                            {kitMaterials.length === 0 && <p className={styles.emptyListText}>No materials added.</p>}
                        </ul>
                    </div>
                </div>
            </div>

            <div className={styles.existingKits}>
                <h2>Existing Kits</h2>
                {kitsLoading ? <p>Loading your kits...</p> : (
                    <ul className={styles.kitList}>
                        {userKits.map(kit => <li key={kit.id} className={styles.kitListItem}>{kit.name}</li>)}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default KitCreatorPage;
