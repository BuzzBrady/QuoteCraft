// src/components/CustomTasksManager.tsx
import { useState, useEffect, useCallback } from 'react';
import styles from './CustomTasksManager.module.css';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig'; // Ensure path is correct
import { useAuth } from '../contexts/AuthContext'; // Ensure path is correct
import { CustomTask } from '../types'; // Ensure path is correct
import TaskFormModal from './TaskFormModal'; // Adjust path if needed

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
    const [currentTask, setCurrentTask] = useState<CustomTask | null>(null); // For editing

    // Fetch Tasks
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
            const fetchedTasks: CustomTask[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
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

    // Modal Handlers
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

    // CRUD Operations
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

        setIsLoading(true); // Indicate loading for save operation
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
            await fetchTasks(); // Re-fetch tasks to update the list
            handleCloseModal();
        } catch (err: any) {
            console.error("Error saving task:", err);
            setError(`Failed to save task: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        console.log("handleDeleteTask CALLED. Task ID:", taskId);
        if (!currentUser) {
            console.error("No current user found for delete operation.");
            setError("You must be logged in to delete a task.");
            return;
        }
        console.log("Current User UID for delete:", currentUser.uid);
    
        // TEMPORARILY BYPASSING window.confirm for debugging
        const proceedWithDelete = true; // Forcing confirmation to true
        console.log("window.confirm SKIPPED for debugging. Proceeding with delete:", proceedWithDelete);
    
        if (proceedWithDelete) { // Using our variable instead of window.confirm()
            // console.log("User CONFIRMED delete."); // This log isn't strictly true anymore but indicates the path taken
            setIsLoading(true);
            setError(null);
            try {
                const docPath = `users/${currentUser.uid}/customTasks/${taskId}`;
                console.log("Attempting to delete document at path:", docPath);
                
                const taskDocRef = doc(db, docPath);
                await deleteDoc(taskDocRef);
                
                console.log("Document successfully deleted from Firestore. Fetching updated tasks...");
                await fetchTasks();
            } catch (err: any) {
                console.error("ERROR during Firestore delete operation (Task):", err);
                setError(`Failed to delete task: ${err.message}. Check console for details.`);
            } finally {
                setIsLoading(false);
            }
        } else {
            // This 'else' block will not be reached with proceedWithDelete = true
            // console.log("User CANCELED delete."); 
        }
    };

    // Render Logic
    if (!currentUser) {
        return <p>Please log in to manage your custom tasks.</p>;
    }

    // Basic styling (replace with CSS classes or styled-components)
    const styles = {
        managerContainer: { padding: '20px', border: '1px solid #eee', borderRadius: '4px' },
        button: {
            padding: '8px 12px',
            margin: '0 5px 10px 0',
            cursor: 'pointer',
            border: '1px solid #007bff',
            backgroundColor: '#007bff',
            color: 'white',
            borderRadius: '4px'
        },
        editButton: { backgroundColor: '#ffc107', borderColor: '#ffc107', color: 'black' },
        deleteButton: { backgroundColor: '#dc3545', borderColor: '#dc3545'},
        taskList: { listStyle: 'none', padding: 0 },
        taskItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: '5px'
        },
        taskDetails: { flexGrow: 1 },
        actions: { whiteSpace: 'nowrap' as 'nowrap' }
    };


    return (
        <div style={styles.managerContainer}>
            <h3>My Custom Tasks</h3>
            <button style={styles.button} onClick={handleOpenModalForAdd} disabled={isLoading}>
                + Add New Task
            </button>

            {isLoading && <p>Loading tasks...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {!isLoading && !error && tasks.length === 0 && (
                <p>You haven't added any custom tasks yet.</p>
            )}

            {!isLoading && !error && tasks.length > 0 && (
                <ul style={styles.taskList}>
                    {tasks.map(task => (
                        <li key={task.id} style={styles.taskItem}>
                            <div style={styles.taskDetails}>
                                <strong>{task.name}</strong>
                                <br />
                                <small>Unit: {task.defaultUnit || 'N/A'}</small>
                                {task.description && <><br /><small>Desc: {task.description}</small></>}
                            </div>
                            <div style={styles.actions}>
                                <button
                                    style={{...styles.button, ...styles.editButton}}
                                    onClick={() => handleOpenModalForEdit(task)}
                                    disabled={isLoading}
                                >
                                    Edit
                                </button>
                                <button
                                    style={{...styles.button, ...styles.deleteButton}}
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