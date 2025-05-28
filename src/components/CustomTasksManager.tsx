// src/components/CustomTasksManager.tsx
import { useState, useEffect, useCallback } from 'react';
import styles from './CustomTasksManager.module.css'; // Import CSS module
import {
    collection,
    query,
    // where, // where was unused
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    // Timestamp // Timestamp was unused directly in this file
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { CustomTask } from '../types';
import TaskFormModal from './TaskFormModal';

interface CustomTasksManagerProps {
    // Props, if any, could be passed here
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
        if (!currentUser) {
            setTasks([]);
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

    const handleSaveTask = async (taskData: { name: string; defaultUnit: string; description: string }) => {
        if (!currentUser) {
            setError("You must be logged in to save a task.");
            return;
        }

        const dataToSave = {
            userId: currentUser.uid,
            name: taskData.name.trim(),
            name_lowercase: taskData.name.trim().toLowerCase(),
            defaultUnit: taskData.defaultUnit.trim() || 'item',
            description: taskData.description.trim(),
            updatedAt: serverTimestamp(),
        };

        setIsLoading(true);
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
        if (!currentUser) {
            setError("You must be logged in to delete a task.");
            return;
        }
        // Bypassing confirmation for non-interactive environments or specific needs.
        // Ensure this is the desired behavior or implement a custom modal for confirmation.
        setIsLoading(true);
        setError(null);
        try {
            const taskDocRef = doc(db, `users/${currentUser.uid}/customTasks`, taskId);
            await deleteDoc(taskDocRef);
            await fetchTasks();
        } catch (err: any) {
            console.error("Error deleting task:", err);
            setError(`Failed to delete task: ${err.message}. Check console for details.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return <p className="text-warning">Please log in to manage your custom tasks.</p>;
    }

    return (
        <div className={styles.managerContainer}> {/* Use CSS module style */}
            <h3 className="mb-lg">My Custom Tasks</h3> {/* Added mb-lg for spacing */}
            <button className="btn btn-primary mb-lg" onClick={handleOpenModalForAdd} disabled={isLoading}>
                + Add New Task
            </button>

            {isLoading && <p>Loading tasks...</p>}
            {error && <p className="text-danger">Error: {error}</p>} {/* Use global text-danger */}

            {!isLoading && !error && tasks.length === 0 && (
                <p>You haven't added any custom tasks yet.</p>
            )}

            {!isLoading && !error && tasks.length > 0 && (
                <ul className={styles.taskList}> {/* Use CSS module style */}
                    {tasks.map(task => (
                        <li key={task.id} className={styles.taskItem}> {/* Use CSS module style */}
                            <div className={styles.taskDetails}> {/* Use CSS module style */}
                                <strong>{task.name}</strong>
                                <br />
                                <small>Unit: {task.defaultUnit || 'N/A'}</small>
                                {task.description && <><br /><small>Desc: {task.description}</small></>}
                            </div>
                            <div className={styles.actions}> {/* Use CSS module style */}
                                <button
                                    className="btn btn-secondary btn-sm" // Global button styles
                                    onClick={() => handleOpenModalForEdit(task)}
                                    disabled={isLoading}
                                >
                                    Edit
                                </button>
                                <button
                                    className="btn btn-danger btn-sm ml-xs" // Global button styles + margin utility
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

            {isModalOpen && (
                <TaskFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveTask}
                    initialData={currentTask}
                    mode={modalMode}
                />
            )}
        </div>
    );
}

export default CustomTasksManager;
