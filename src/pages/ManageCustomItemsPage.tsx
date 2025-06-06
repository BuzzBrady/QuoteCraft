// src/pages/ManageCustomItemsPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link for the back button
import CustomTasksManager from '../components/CustomTasksManager';
import CustomMaterialsManager from '../components/CustomMaterialsManager';
import styles from './ManageCustomItemsPage.module.css'; // Renamed import to use as a module

type ActiveTab = 'tasks' | 'materials';

function ManageCustomItemsPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');

    return (
        <div className={styles.pageContainer}>
             <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Manage My Library</h1>
                <Link to="/dashboard" className={styles.backLink}>Back to Dashboard</Link>
            </div>

            <div className={styles.tabNavigation}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'tasks' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    Custom Tasks
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'materials' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('materials')}
                >
                    Custom Materials
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'tasks' && <CustomTasksManager />}
                {activeTab === 'materials' && <CustomMaterialsManager />}
            </div>
        </div>
    );
}

export default ManageCustomItemsPage;