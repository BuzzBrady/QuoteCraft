// src/components/CustomTasksManager.tsx

import React, { useState } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { Task } from '../types';
import TaskFormModal from './TaskFormModal';
import styles from './CustomTasksManager.module.css';
import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const CustomTasksManager: React.FC = () => {
    const { currentUser } = useAuth();
    // 1. Fetch data directly inside the component
    const { data: customTasks, isLoading, refetch } = useUserCollection<Task>('customTasks', 'name');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const handleOpenModal = (task: Task | null = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingTask(null);
        setIsModalOpen(false);
    };

    const handleSave = async (taskData: Omit<Task, 'id' | 'userId'>) => {
        if (!currentUser) return;
        
        try {
            if (editingTask) {
                // Update existing task
                const taskRef = doc(db, 'users', currentUser.uid, 'customTasks', editingTask.id);
                await updateDoc(taskRef, { ...taskData, updatedAt: serverTimestamp() });
            } else {
                // Add new task
                const collectionRef = collection(db, 'users', currentUser.uid, 'customTasks');
                await addDoc(collectionRef, { ...taskData, userId: currentUser.uid, createdAt: serverTimestamp() });
            }
            refetch(); // 2. Refetch the data after saving
            handleCloseModal();
        } catch (error) {
            console.error("Error saving custom task: ", error);
        }
    };
    
    const handleDelete = async (taskId: string) => {
        if (!currentUser || !window.confirm("Are you sure you want to delete this task?")) return;
        try {
            const taskRef = doc(db, 'users', currentUser.uid, 'customTasks', taskId);
            await deleteDoc(taskRef);
            refetch(); // 3. Refetch the data after deleting
        } catch (error) {
            console.error("Error deleting custom task: ", error);
        }
    };

    return (
        <div className={styles.manager}>
            <button onClick={() => handleOpenModal()} className={styles.addButton}>
                Add New Task
            </button>
            {isLoading && <p>Loading tasks...</p>}
            <ul className={styles.list}>
                {customTasks.map((task) => (
                    <li key={task.id} className={styles.listItem}>
                        <span>{task.name}</span>
                        <div className={styles.actions}>
                            <button onClick={() => handleOpenModal(task)}>Edit</button>
                            <button onClick={() => handleDelete(task.id)} className={styles.deleteButton}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
            <TaskFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                initialData={editingTask}
                mode={editingTask ? 'edit' : 'add'}
            />
        </div>
    );
};

export default CustomTasksManager;