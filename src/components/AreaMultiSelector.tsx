// src/components/AreaMultiSelector.tsx

import React, { useState, useEffect } from 'react';
import { Area } from '../types';
import styles from './AreaMultiSelector.module.css';

interface AreaMultiSelectorProps {
  onSelectionChange: (selectedIds: string[]) => void;
}

const AreaMultiSelector: React.FC<AreaMultiSelectorProps> = ({ onSelectionChange }) => {
  // NOTE: For a complete solution, 'areas' should be added to and fetched from useDataStore.
  // For now, we are fetching it here.
  const [areas, setAreas] = useState<Area[]>([]);
  useEffect(() => {
    const fetchAreas = async () => {
        // This should be replaced with a call to the global store
        const { getDocs, collection, db } = await import('firebase/firestore').then(m => ({...m, db: import('../config/firebaseConfig').then(c => c.db)}));
        const resolvedDb = await db;
        const areaSnapshot = await getDocs(collection(resolvedDb, 'areas'));
        setAreas(areaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Area)));
    };
    fetchAreas();
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggle = (areaId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(areaId)) {
      newSelectedIds.delete(areaId);
    } else {
      newSelectedIds.add(areaId);
    }
    setSelectedIds(newSelectedIds);
    onSelectionChange(Array.from(newSelectedIds));
  };

  return (
    <div className={styles.areaContainer}>
      <h3>Select Applicable Areas</h3>
      <div className={styles.areaGrid}>
        {areas.map(area => (
          <div
            key={area.id}
            className={`${styles.areaChip} ${selectedIds.has(area.id) ? styles.selected : ''}`}
            onClick={() => handleToggle(area.id)}
          >
            {area.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AreaMultiSelector;