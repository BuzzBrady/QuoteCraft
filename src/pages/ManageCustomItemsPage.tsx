// src/pages/ManageCustomItemsPage.tsx
import { useState } from 'react';
import CustomTasksManager from '../components/CustomTasksManager';
import CustomMaterialsManager from '../components/CustomMaterialsManager'; // <-- UNCOMMENT or ensure this import is correct
import './ManageCustomItemsPage.css'; // Ensure this file exists and has styles

type ActiveTab = 'tasks' | 'materials';

function ManageCustomItemsPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');

    return (
        <div className="manage-custom-items-page">
            <h2>Manage My Custom Library</h2>

            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    Custom Tasks
                </button>
                <button
                    className={`tab-button ${activeTab === 'materials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('materials')}
                    // disabled // <-- REMOVE the disabled attribute if it's here
                >
                    Custom Materials
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'tasks' && <CustomTasksManager />}
                {activeTab === 'materials' && <CustomMaterialsManager />} {/* <-- UNCOMMENT and ensure this renders */}
                {/* Remove any placeholder like "Custom Materials Management Coming Soon!" if it was here */}
            </div>
        </div>
    );
}

export default ManageCustomItemsPage;