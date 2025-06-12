// src/pages/ManageCustomItemsPage.tsx

import React from 'react';
import CustomTasksManager from '../components/CustomTasksManager';
import CustomMaterialsManager from '../components/CustomMaterialsManager';
import styles from './ManageCustomItemsPage.module.css';

const ManageCustomItemsPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1>Manage Custom Library</h1>
      <p>Add or edit custom tasks and materials that are unique to your business.</p>

      <div className={styles.managersContainer}>
        <div className={styles.managerWrapper}>
          <h2>Custom Tasks</h2>
          <CustomTasksManager />
        </div>

        <div className={styles.managerWrapper}>
          <h2>Custom Materials</h2>
          <CustomMaterialsManager />
        </div>
      </div>
    </div>
  );
};

export default ManageCustomItemsPage;