// src/components/MainLayout.tsx

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // <-- 1. Import Outlet
import Header from '../../Header';
import styles from './MainLayout.module.css';
import { useDataStore } from '../stores/useDataStore';

// 2. Remove the children prop from the function definition
const MainLayout = () => {
  const fetchInitialData = useDataStore((state) => state.fetchInitialData);
  const isLoading = useDataStore((state) => state.isLoading);
  const error = useDataStore((state) => state.error);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>Loading essential data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={`${styles.centered} ${styles.error}`}>
          <h2>A critical error occurred:</h2>
          <p>{error}</p>
          <p>Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainLayout}>
      <Header />
      <main className={styles.content}>
        <Outlet /> {/* <-- 3. Render the nested route's content here */}
      </main>
    </div>
  );
};

export default MainLayout;