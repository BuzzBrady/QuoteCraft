// src/components/CustomTasksManager.tsx
import { useState, useEffect, useCallback } from 'react';
import styles from './CustomTasksManager.module.css';
import {
    collection,
    query,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    orderBy,
    Timestamp,
    deleteField
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { CustomTask } from '../types';
import TaskFormModal from './TaskFormModal';

interface CustomTasksManagerProps {
    // Props, if any
}

function CustomTasksManager({}: CustomTasksManagerProps) {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState<CustomTask[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentTask, setCurrentTask] = useState<CustomTask | null>(null);

    const fetchTasks = useCallback(async () => {
        if (!currentUser?.uid) {
            setTasks([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const tasksCollectionRef = collection(db, `users/${currentUser.uid}/customTasks`);
            const q = query(tasksCollectionRef, orderBy('name_lowercase', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedTasks: CustomTask[] = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as CustomTask));
            setTasks(fetchedTasks);
        } catch (err: any) {
            console.error("Error fetching custom tasks:", err);
            setError("Failed to fetch custom tasks. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleOpenModalForAdd = () => {
        setCurrentTask(null);
        setModalMode('add');
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (task: CustomTask) => {
        setCurrentTask(task);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentTask(null);
    };

    const handleSaveTask = async (taskData: { name: string; defaultUnit: string; description: string; taskRate?: number }) => {
        if (!currentUser) {
            setError("You must be logged in to save a task.");
            return;
        }

        setIsLoading(true);
        
        const dataToSave: any = {
            userId: currentUser.uid,
            name: taskData.name.trim(),
            name_lowercase: taskData.name.trim().toLowerCase(),
            defaultUnit: taskData.defaultUnit.trim() || 'item',
            description: taskData.description.trim(),
            updatedAt: serverTimestamp(),
        };

        if (taskData.taskRate !== undefined && !isNaN(taskData.taskRate)) {
            dataToSave.taskRate = taskData.taskRate;
        } else {
            dataToSave.taskRate = deleteField(); 
        }

        try {
            if (modalMode === 'add') {
                await addDoc(collection(db, `users/${currentUser.uid}/customTasks`), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                });
            } else if (modalMode === 'edit' && currentTask?.id) {
                const taskDocRef = doc(db, `users/${currentUser.uid}/customTasks`, currentTask.id);
                await updateDoc(taskDocRef, dataToSave);
            }
            await fetchTasks();
            handleCloseModal();
        } catch (err: any) {
            console.error("Error saving task:", err);
            setError(`Failed to save task: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!currentUser?.uid || !window.confirm("Are you sure you want to delete this task? This cannot be undone.")) {
            return;
        }
        setIsLoading(true);
        try {
            const taskDocRef = doc(db, `users/${currentUser.uid}/customTasks`, taskId);
            await deleteDoc(taskDocRef);
            await fetchTasks();
        } catch (err: any) {
            console.error("Error deleting task:", err);
            setError(`Failed to delete task: ${err.message}.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return <p className="text-warning">Please log in to manage your custom tasks.</p>;
    }

    return (
        <div className={styles.managerContainer}>
            <h3 className="mb-lg">My Custom Tasks</h3>
            <button className="btn btn-primary mb-lg" onClick={handleOpenModalForAdd} disabled={isLoading}>
                + Add New Task
            </button>

            {isLoading && <p>Loading tasks...</p>}
            {error && <p className="text-danger">{error}</p>}

            {!isLoading && !error && tasks.length === 0 && (
                <p>You haven't added any custom tasks yet.</p>
            )}

            {!isLoading && !error && tasks.length > 0 && (
                 <ul className={styles.itemList}>
                    {tasks.map(task => (
                        <li key={task.id} className={styles.item}>
                           <div className={styles.itemDetails}>
                                <strong>{task.name}</strong>
                                {(task.taskRate !== undefined && task.taskRate !== null) && (
                                    <>
                                        <br />
                                        <small>Rate: ${Number(task.taskRate).toFixed(2)} per {task.defaultUnit || 'item'}</small>
                                    </>
                                )}
                                {task.description && <><br /><small className={styles.descriptionText}>Desc: {task.description}</small></>}
                            </div>
                            <div className={styles.actions}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpenModalForEdit(task)}
                                    disabled={isLoading}
                                >
                                    Edit
                                </button>
                                <button
                                    className="btn btn-danger btn-sm ml-xs"
                                    onClick={() => handleDeleteTask(task.id)}
                                    disabled={isLoading}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isModalOpen && currentUser?.uid && (
                <TaskFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveTask}
                    // userId={currentUser.uid} // <-- THIS LINE IS REMOVED
                    initialData={currentTask}
                    mode={modalMode}
                />
            )}
        </div>
    );
}

export default CustomTasksManager;