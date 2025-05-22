// src/pages/KitCreatorPage.tsx
// Page for creating, viewing, and managing Kit Templates.
// Includes item selection, cost calculation, "Quick Add", and corrected MaterialOptionSelector usage.
// Corrected TypeScript type conflicts.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
// Ensure CombinedTask and CombinedMaterial are imported from types.ts and NOT re-declared locally
import { 
    KitTemplate, 
    KitLineItemTemplate, 
    Task, 
    CustomTask, 
    Material, 
    CustomMaterial, 
    MaterialOption, 
    UserRateTemplate,
    CombinedTask,  // Imported from types.ts
    CombinedMaterial // Imported from types.ts
} from '../types';
import { v4 as uuidv4 } from 'uuid';

import TaskSelector from '../components/TaskSelector';
import MaterialSelector from '../components/MaterialSelector';
import MaterialOptionSelector from '../components/MaterialOptionSelector';
import QuickAddMaterialModal from '../components/QuickAddMaterialModal';

import styles from './KitCreatorPage.module.css';

// Utility functions (assuming these are correct and don't cause type issues with UserRateTemplate)
const findMatchingRate = (
    rates: UserRateTemplate[],
    taskId: string | null,
    materialId: string | null,
    optionId: string | null
): UserRateTemplate | undefined => {
    let match = rates.find(rate =>
        rate.taskId === taskId &&
        rate.materialId === materialId &&
        rate.materialOptionId === optionId
    );
    if (match) return match;
    if (materialId && !match) {
        match = rates.find(rate =>
            rate.taskId === taskId &&
            rate.materialId === materialId &&
            (rate.materialOptionId === null || rate.materialOptionId === undefined)
        );
        if (match) return match;
    }
    if (taskId && !materialId && !match) {
        match = rates.find(rate =>
            rate.taskId === taskId &&
            (rate.materialId === null || rate.materialId === undefined) &&
            (rate.materialOptionId === null || rate.materialOptionId === undefined)
        );
        if (match) return match;
    }
    return undefined;
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${Number(amount).toFixed(2)}`;
};


type ActiveTab = 'myKits' | 'kitBuilder';

// REMOVE LOCAL DECLARATIONS OF CombinedTask and CombinedMaterial
// type CombinedTask = (Task | CustomTask) & { isCustom?: boolean }; // REMOVE THIS
// type CombinedMaterial = (Material | CustomMaterial) & { isCustom?: boolean; options?: MaterialOption[] }; // REMOVE THIS

interface KitItemFormData {
    id: string;
    selectedTaskObj: CombinedTask | null;
    selectedMaterialObj: CombinedMaterial | null;
    selectedMaterialOptionObj: MaterialOption | null;
    displayName: string;
    baseQuantity: number;
    unit: string;
    inputType: 'quantity' | 'price' | 'checkbox';
    description?: string;
    overrideRateForKit: string;
    calculatedRate: number;
    finalRateForKitItem: number;
    calculatedTotal: number;
}

const initialKitItemFormData: KitItemFormData = {
    id: '', selectedTaskObj: null, selectedMaterialObj: null, selectedMaterialOptionObj: null,
    displayName: '', baseQuantity: 1, unit: 'item', inputType: 'quantity', description: '',
    overrideRateForKit: '',
    calculatedRate: 0, finalRateForKitItem: 0, calculatedTotal: 0,
};

function KitCreatorPage() {
    const { currentUser } = useAuth();
    const userId = currentUser?.uid;

    const [activeTab, setActiveTab] = useState<ActiveTab>('myKits');
    const [userKits, setUserKits] = useState<KitTemplate[]>([]);
    const [isLoadingKits, setIsLoadingKits] = useState<boolean>(true);
    const [errorKits, setErrorKits] = useState<string | null>(null);

    const [currentKitId, setCurrentKitId] = useState<string | null>(null);
    const [kitName, setKitName] = useState('');
    const [kitDescription, setKitDescription] = useState('');
    const [kitTags, setKitTags] = useState('');
    const [kitLineItems, setKitLineItems] = useState<KitLineItemTemplate[]>([]);
    
    const [isSavingKit, setIsSavingKit] = useState<boolean>(false);
    const [kitBuilderError, setKitBuilderError] = useState<string | null>(null);

    const [showItemForm, setShowItemForm] = useState<boolean>(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [itemFormData, setItemFormData] = useState<KitItemFormData>(initialKitItemFormData);

    // Use the imported CombinedTask and CombinedMaterial types for state
    const [allTasks, setAllTasks] = useState<CombinedTask[]>([]);
    const [allMaterials, setAllMaterials] = useState<CombinedMaterial[]>([]);
    const [userRates, setUserRates] = useState<UserRateTemplate[]>([]);
    const [isLoadingGlobalData, setIsLoadingGlobalData] = useState(false);

    const [isKitItemQuickAddMaterialModalOpen, setIsKitItemQuickAddMaterialModalOpen] = useState(false);
    const [kitItemQuickAddMaterialInitialName, setKitItemQuickAddMaterialInitialName] = useState('');
    const kitItemCreateMaterialPromiseRef = useRef<{ resolve: (value: CombinedMaterial | null) => void; reject: (reason?: any) => void; } | null>(null);

    const fetchUserKits = useCallback(async () => {
        if (!userId) { setUserKits([]); setIsLoadingKits(false); return; }
        setIsLoadingKits(true); setErrorKits(null);
        try {
            const kitsRef = collection(db, `users/${userId}/kitTemplates`);
            const q = query(kitsRef, orderBy('name_lowercase', 'asc'));
            const snapshot = await getDocs(q);
            setUserKits(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KitTemplate)));
        } catch (err: any) { console.error("Error fetching kits:", err); setErrorKits(`Failed to load kits: ${err.message}`); }
        finally { setIsLoadingKits(false); }
    }, [userId]);

    useEffect(() => { if (activeTab === 'myKits') fetchUserKits(); }, [userId, activeTab, fetchUserKits]);

    useEffect(() => {
        if (!userId) return;
        setIsLoadingGlobalData(true);
        const fetchData = async () => {
            try {
                const [tasksSnap, customTasksSnap, materialsSnap, customMaterialsSnap, ratesSnap] = await Promise.all([
                    getDocs(query(collection(db, 'tasks'))),
                    getDocs(query(collection(db, `users/${userId}/customTasks`))),
                    getDocs(query(collection(db, 'materials'))),
                    getDocs(query(collection(db, `users/${userId}/customMaterials`))),
                    getDocs(query(collection(db, `users/${userId}/rateTemplates`)))
                ]);

                const globalTasks = tasksSnap.docs.map(d => {
                    const data = d.data();
                    return { 
                        id: d.id, 
                        ...data, 
                        name: data.name || '', // Ensure name is string
                        name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') // Ensure name_lowercase is string
                    } as CombinedTask; // Cast to the imported CombinedTask
                });
                const userTasks = customTasksSnap.docs.map(d => {
                    const data = d.data();
                    return { 
                        id: d.id, 
                        ...data, 
                        isCustom: true, 
                        name: data.name || '', 
                        name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') 
                    } as CombinedTask; // Cast to the imported CombinedTask
                });
                setAllTasks([...globalTasks, ...userTasks].sort((a,b) => a.name_lowercase.localeCompare(b.name_lowercase)));

                const globalMtls = materialsSnap.docs.map(d => {
                    const data = d.data();
                    return { 
                        id: d.id, 
                        ...data, 
                        name: data.name || '', 
                        name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') 
                    } as CombinedMaterial; // Cast to the imported CombinedMaterial
                });
                const userMtls = customMaterialsSnap.docs.map(d => {
                    const data = d.data();
                    return { 
                        id: d.id, 
                        ...data, 
                        isCustom: true, 
                        name: data.name || '', 
                        name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') 
                    } as CombinedMaterial; // Cast to the imported CombinedMaterial
                });
                setAllMaterials([...globalMtls, ...userMtls].sort((a,b) => a.name_lowercase.localeCompare(b.name_lowercase)));
                
                setUserRates(ratesSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserRateTemplate)));

            } catch (error) {
                console.error("Error fetching global data for Kit Creator:", error);
                setKitBuilderError("Failed to load necessary data (tasks, materials, rates).");
            } finally {
                setIsLoadingGlobalData(false);
            }
        };
        fetchData();
    }, [userId]);

    useEffect(() => {
        const task = itemFormData.selectedTaskObj;
        const material = itemFormData.selectedMaterialObj;
        const option = itemFormData.selectedMaterialOptionObj;
        let initialRate = 0;
        let unit = itemFormData.unit || material?.defaultUnit || task?.defaultUnit || 'item';
        let suggestedDisplayName = '';
        if (task) suggestedDisplayName += task.name;
        if (material) suggestedDisplayName += (suggestedDisplayName ? ' - ' : '') + material.name;
        if (option) suggestedDisplayName += ` (${option.name})`;
        
        const matchingRate = findMatchingRate(userRates, task?.id || null, material?.id || null, option?.id || null);

        if (matchingRate) {
            initialRate = matchingRate.referenceRate;
            unit = matchingRate.unit || unit;
        } else if (material) {
            initialRate = material.defaultRate || 0;
            if (option && typeof option.rateModifier === 'number') {
                initialRate += option.rateModifier;
            }
            unit = material.defaultUnit || unit;
        } else if (task) {
            initialRate = 0; 
            unit = task.defaultUnit || unit;
        }
        
        const overrideRateNum = parseFloat(itemFormData.overrideRateForKit);
        const finalRate = !isNaN(overrideRateNum) && itemFormData.overrideRateForKit.trim() !== '' ? overrideRateNum : initialRate;
        const total = itemFormData.inputType === 'price' ? finalRate : (Number(itemFormData.baseQuantity) * finalRate);

        setItemFormData(prev => ({
            ...prev, unit, calculatedRate: isNaN(initialRate) ? 0 : initialRate, 
            finalRateForKitItem: isNaN(finalRate) ? 0 : finalRate, 
            calculatedTotal: isNaN(total) ? 0 : total,
            displayName: prev.displayName || suggestedDisplayName || 'New Kit Item',
        }));
    }, [
        itemFormData.selectedTaskObj, itemFormData.selectedMaterialObj, itemFormData.selectedMaterialOptionObj, 
        itemFormData.baseQuantity, itemFormData.inputType, itemFormData.overrideRateForKit, 
        userRates, 
        // itemFormData.unit // Removed to prevent potential infinite loop if unit is also set here. Unit calculation seems okay above.
    ]);

    const resetKitBuilderForm = useCallback(() => {
        setCurrentKitId(null); setKitName(''); setKitDescription(''); setKitTags('');
        setKitLineItems([]); setShowItemForm(false); setEditingItemIndex(null);
        setItemFormData(initialKitItemFormData); setKitBuilderError(null);
    }, []);

    const handleCreateNewKit = useCallback(() => {
        resetKitBuilderForm();
        setActiveTab('kitBuilder');
    }, [resetKitBuilderForm]);

    const handleEditKit = useCallback((kit: KitTemplate) => {
        setCurrentKitId(kit.id);
        setKitName(kit.name);
        setKitDescription(kit.description || '');
        setKitTags(kit.tags?.join(', ') || '');
        setKitLineItems(kit.lineItems ? JSON.parse(JSON.stringify(kit.lineItems)) : []);
        setShowItemForm(false); setEditingItemIndex(null); setItemFormData(initialKitItemFormData);
        setActiveTab('kitBuilder');
    }, []);

    const handleDeleteKit = useCallback(async (kitId: string) => {
        if (!userId || !kitId || !window.confirm("Delete this kit? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, `users/${userId}/kitTemplates`, kitId));
            alert("Kit deleted.");
            fetchUserKits(); 
            if (currentKitId === kitId) { resetKitBuilderForm(); setActiveTab('myKits'); }
        } catch (err: any) { console.error("Error deleting kit:", err); alert(`Failed to delete kit: ${err.message}`);}
       }, [userId, currentKitId, fetchUserKits, resetKitBuilderForm]);
    
    const handleItemFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumericQuantity = name === 'baseQuantity';
        setItemFormData(prev => ({ 
            ...prev, 
            [name]: isNumericQuantity ? parseFloat(value) || 0 : value 
        }));
    };
    
    const handleCreateCustomTaskForItemForm = useCallback(async (taskName: string): Promise<CombinedTask | null> => {
        if (!userId) { alert("Login required."); return null; }
        if (!taskName?.trim()) { alert("Task name empty."); return null; }
        const defaultUnit = prompt(`Default unit for new task "${taskName}":`, 'item') || 'item';
        const newTaskData = { 
            userId, 
            name: taskName.trim(), 
            name_lowercase: taskName.trim().toLowerCase(), 
            defaultUnit, 
            description: "", 
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp() 
        };
        try {
            const docRef = await addDoc(collection(db, `users/${userId}/customTasks`), newTaskData);
            const createdTask: CombinedTask = { 
                id: docRef.id, 
                ...newTaskData, 
                isCustom: true, 
                name: newTaskData.name, // Ensure name is part of the object for CombinedTask
                name_lowercase: newTaskData.name_lowercase, // Ensure name_lowercase
                createdAt: Timestamp.now(), // For local state after creation
                updatedAt: Timestamp.now()  // For local state after creation
            } as CombinedTask; // Casting as ServerTimestamp fields are not Timestamps yet.
            setAllTasks(prev => [...prev, createdTask].sort((a,b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            setItemFormData(prev => ({...prev, selectedTaskObj: createdTask, displayName: createdTask.name, unit: createdTask.defaultUnit || 'item' }));
            return createdTask;
        } catch (error) { console.error("Error saving custom task for kit item:", error); alert(`Failed to save task "${taskName}".`); return null; }
    }, [userId]);

    const initiateCreateCustomMaterialForItemForm = useCallback((materialName: string): Promise<CombinedMaterial | null> => {
        return new Promise((resolve, reject) => {
            if (!userId) { alert("Login required."); reject(new Error("User not logged in")); return; }
            setKitItemQuickAddMaterialInitialName(materialName.trim());
            setIsKitItemQuickAddMaterialModalOpen(true);
            kitItemCreateMaterialPromiseRef.current = { resolve, reject };
        });
    }, [userId]);

    const handleSaveKitItemQuickAddMaterial = async (modalData: { name: string; description: string; optionsAvailable: boolean; defaultRate?: number; defaultUnit?: string; }) => {
        if (!userId || !kitItemCreateMaterialPromiseRef.current) {
            if (kitItemCreateMaterialPromiseRef.current) kitItemCreateMaterialPromiseRef.current.reject(new Error("Save conditions unmet."));
            kitItemCreateMaterialPromiseRef.current = null; setIsKitItemQuickAddMaterialModalOpen(false); return;
        }
        const { resolve, reject } = kitItemCreateMaterialPromiseRef.current;
        const newMatData = { 
            userId, 
            name: modalData.name, 
            name_lowercase: modalData.name.toLowerCase(), 
            description: modalData.description, 
            optionsAvailable: modalData.optionsAvailable, 
            defaultRate: modalData.defaultRate, 
            defaultUnit: modalData.defaultUnit || 'item', 
            searchKeywords: [modalData.name.toLowerCase()], 
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp() 
        };
        try {
            const docRef = await addDoc(collection(db, `users/${userId}/customMaterials`), newMatData);
            const createdMat: CombinedMaterial = { 
                id: docRef.id, 
                ...newMatData, 
                isCustom: true, 
                name: newMatData.name, // Ensure name
                name_lowercase: newMatData.name_lowercase, // Ensure name_lowercase
                createdAt: Timestamp.now(), 
                updatedAt: Timestamp.now() 
            };
            setAllMaterials(prev => [...prev, createdMat].sort((a,b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            setItemFormData(prev => ({...prev, selectedMaterialObj: createdMat, selectedMaterialOptionObj: null, displayName: createdMat.name, unit: createdMat.defaultUnit || 'item'}));
            resolve(createdMat);
        } catch (error) { console.error("Error saving material for kit item:", error); reject(error); }
        finally { setIsKitItemQuickAddMaterialModalOpen(false); kitItemCreateMaterialPromiseRef.current = null; }
    };

    const handleCloseKitItemQuickAddMaterialModal = () => {
        setIsKitItemQuickAddMaterialModalOpen(false);
        if (kitItemCreateMaterialPromiseRef.current) { kitItemCreateMaterialPromiseRef.current.resolve(null); kitItemCreateMaterialPromiseRef.current = null; }
    };

    const handleTaskSelectForItemForm = (task: CombinedTask | null) => {
        setItemFormData(prev => ({
            ...initialKitItemFormData, 
            id: prev.id || uuidv4(),   
            selectedTaskObj: task,
            selectedMaterialObj: null, 
            selectedMaterialOptionObj: null,
            displayName: task?.name || '',
            unit: task?.defaultUnit || 'item',
        }));
    };

    const handleMaterialSelectForItemForm = (material: CombinedMaterial | null) => {
        setItemFormData(prev => ({
            ...initialKitItemFormData,
            id: prev.id || uuidv4(),
            selectedTaskObj: prev.selectedTaskObj, 
            selectedMaterialObj: material,
            selectedMaterialOptionObj: null, 
            displayName: material ? (prev.selectedTaskObj ? `${prev.selectedTaskObj.name} - ${material.name}` : material.name) : (prev.selectedTaskObj?.name || ''),
            unit: material?.defaultUnit || prev.selectedTaskObj?.defaultUnit || 'item',
        }));
    };
    
    const handleOptionSelectForItemForm = (option: MaterialOption | null) => {
        setItemFormData(prev => ({ ...prev, selectedMaterialOptionObj: option }));
    };

    const handleAddItemToKit = () => {
        if (!itemFormData.displayName.trim()) { alert("Item display name is required."); return; }
        if (!itemFormData.selectedTaskObj && !itemFormData.selectedMaterialObj) { alert("Please select a task or a material for the kit item."); return; }
        if (itemFormData.selectedMaterialObj?.optionsAvailable && !itemFormData.selectedMaterialOptionObj) { alert("Please select an option for the chosen material."); return; }

        const newItemForKit: KitLineItemTemplate = {
            taskId: itemFormData.selectedTaskObj?.id || null,
            materialId: itemFormData.selectedMaterialObj?.id || null,
            materialOptionId: itemFormData.selectedMaterialOptionObj?.id || null,
            materialOptionName: itemFormData.selectedMaterialOptionObj?.name || null,
            displayName: itemFormData.displayName.trim(),
            baseQuantity: Number(itemFormData.baseQuantity) || 1,
            unit: itemFormData.unit,
            inputType: itemFormData.inputType,
            description: itemFormData.description?.trim() || undefined,
            // rateForKit: itemFormData.finalRateForKitItem, 
        };

        if (editingItemIndex !== null) {
            const updatedItems = [...kitLineItems];
            updatedItems[editingItemIndex] = newItemForKit;
            setKitLineItems(updatedItems);
        } else {
            setKitLineItems(prev => [...prev, newItemForKit]);
        }
        setItemFormData({...initialKitItemFormData, id: uuidv4()});
        setEditingItemIndex(null);
        setShowItemForm(false); 
    };
    
    const handleEditKitItem = (itemToEdit: KitLineItemTemplate, index: number) => {
        const task = itemToEdit.taskId ? allTasks.find(t => t.id === itemToEdit.taskId) || null : null;
        const material = itemToEdit.materialId ? allMaterials.find(m => m.id === itemToEdit.materialId) || null : null;
        let option: MaterialOption | null = null;
        if (material && material.optionsAvailable && itemToEdit.materialOptionId && itemToEdit.materialOptionName) {
             option = {id: itemToEdit.materialOptionId, name: itemToEdit.materialOptionName} as MaterialOption; // Assuming structure
        }
        setItemFormData({
            id: uuidv4(), 
            selectedTaskObj: task, selectedMaterialObj: material, selectedMaterialOptionObj: option,
            displayName: itemToEdit.displayName, baseQuantity: itemToEdit.baseQuantity,
            unit: itemToEdit.unit, inputType: itemToEdit.inputType,
            description: itemToEdit.description || '',
            overrideRateForKit: '', 
            calculatedRate: 0, finalRateForKitItem: 0, calculatedTotal: 0, 
        });
        setEditingItemIndex(index); setShowItemForm(true);
    };

    const handleRemoveKitItem = (indexToRemove: number) => { setKitLineItems(prev => prev.filter((_, index) => index !== indexToRemove)); };

    const handleSaveKit = async () => {
        if (!userId || !kitName.trim() || kitLineItems.length === 0) {
            setKitBuilderError("User, Kit Name, and at least one item are required."); return;
        }
        setIsSavingKit(true); setKitBuilderError(null);
        const kitDataToSave: Omit<KitTemplate, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: any, updatedAt: any } = {
            userId, name: kitName.trim(), name_lowercase: kitName.trim().toLowerCase(),
            description: kitDescription.trim() || undefined,
            tags: kitTags.split(',').map(tag => tag.trim()).filter(tag => tag),
            lineItems: kitLineItems.map(item => ({ 
                taskId: item.taskId, materialId: item.materialId, materialOptionId: item.materialOptionId,
                materialOptionName: item.materialOptionName, displayName: item.displayName,
                baseQuantity: item.baseQuantity, unit: item.unit, inputType: item.inputType,
                description: item.description,
            })),
            isGlobal: false, updatedAt: serverTimestamp(),
        };
        try {
            if (currentKitId) {
                await updateDoc(doc(db, `users/${userId}/kitTemplates`, currentKitId), kitDataToSave);
            } else {
                const docRef = await addDoc(collection(db, `users/${userId}/kitTemplates`), { ...kitDataToSave, createdAt: serverTimestamp() });
                setCurrentKitId(docRef.id); 
            }
            alert("Kit saved successfully!"); fetchUserKits(); setActiveTab('myKits');
        } catch (err: any) { console.error("Error saving kit:", err); setKitBuilderError(`Failed: ${err.message}`); alert(`Failed: ${err.message}`);}
        finally { setIsSavingKit(false); }
    };
    
    const kitBuilderItemForm = showItemForm && (
        <div className={styles.formSection} style={{backgroundColor: '#e9f5ff'}}>
            <h4 className={styles.formSectionTitle}>{editingItemIndex !== null ? 'Edit Item in Kit' : 'Add New Item to Kit'}</h4>
            
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Task:</label>
                <TaskSelector
                    userId={userId}
                    onSelect={handleTaskSelectForItemForm}
                    onCreateCustomTask={handleCreateCustomTaskForItemForm} // This function returns Promise<CombinedTask | null>
                    isLoading={isLoadingGlobalData}
                    allTasks={allTasks} // Assuming TaskSelectorProps expects CombinedTask[]
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Material:</label>
                <MaterialSelector
                    userId={userId}
                    onSelect={handleMaterialSelectForItemForm}
                    onCreateCustomMaterial={initiateCreateCustomMaterialForItemForm} // This function returns Promise<CombinedMaterial | null>
                    isLoading={isLoadingGlobalData}
                    allMaterials={allMaterials} // Assuming MaterialSelectorProps expects CombinedMaterial[]
                />
            </div>

            {itemFormData.selectedMaterialObj?.optionsAvailable && (
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Material Option:</label>
                    <MaterialOptionSelector
                        selectedMaterial={itemFormData.selectedMaterialObj} 
                        onSelect={handleOptionSelectForItemForm}
                    />
                </div>
            )}

            <div className={styles.formGroup}>
                <label htmlFor={`kitItemDisplayName-${itemFormData.id}`} className={styles.formLabel}>Display Name (for this kit)*:</label>
                <input type="text" id={`kitItemDisplayName-${itemFormData.id}`} name="displayName" value={itemFormData.displayName} onChange={handleItemFormInputChange} className={styles.formInput} required />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                <div className={styles.formGroup}>
                    <label htmlFor={`kitItemBaseQuantity-${itemFormData.id}`} className={styles.formLabel}>Base Quantity*:</label>
                    <input type="number" id={`kitItemBaseQuantity-${itemFormData.id}`} name="baseQuantity" value={itemFormData.baseQuantity} onChange={handleItemFormInputChange} className={styles.formInput} min="0.01" step="any" required />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor={`kitItemUnit-${itemFormData.id}`} className={styles.formLabel}>Unit*:</label>
                    <input type="text" id={`kitItemUnit-${itemFormData.id}`} name="unit" value={itemFormData.unit} onChange={handleItemFormInputChange} className={styles.formInput} required />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor={`kitItemInputType-${itemFormData.id}`} className={styles.formLabel}>Input Type*:</label>
                    <select id={`kitItemInputType-${itemFormData.id}`} name="inputType" value={itemFormData.inputType} onChange={handleItemFormInputChange} className={styles.formSelect}>
                        <option value="quantity">Quantity-based Price</option>
                        <option value="price">Fixed Price</option>
                        <option value="checkbox">Checkbox (Informational)</option> 
                    </select>
                </div>
            </div>

            {(itemFormData.inputType === 'quantity' || itemFormData.inputType === 'price') && (
                 <div className={styles.formGroup}>
                    <label htmlFor={`kitItemOverrideRate-${itemFormData.id}`} className={styles.formLabel}>
                        {itemFormData.inputType === 'quantity' ? 'Override Rate for this Kit ($):' : 'Price for this Kit ($):'}
                    </label>
                    <input 
                        type="number" 
                        id={`kitItemOverrideRate-${itemFormData.id}`} 
                        name="overrideRateForKit" 
                        value={itemFormData.overrideRateForKit} 
                        onChange={handleItemFormInputChange} 
                        className={styles.formInput} 
                        placeholder={`Auto: ${formatCurrency(itemFormData.calculatedRate)}`}
                        step="any"
                    />
                    {itemFormData.inputType === 'quantity' && <small>Leave blank to use calculated rate.</small>}
                </div>
            )}

             <div className={styles.formGroup}>
                <p style={{fontWeight: '500'}}>
                    {itemFormData.overrideRateForKit.trim() !== '' ? 'Using Overridden Rate: ' : 'Calculated Rate: '} 
                    {formatCurrency(itemFormData.finalRateForKitItem)} / {itemFormData.unit}
                </p>
                <p style={{fontWeight: 'bold'}}>Final Total for Item: {formatCurrency(itemFormData.calculatedTotal)}</p>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor={`kitItemDescription-${itemFormData.id}`} className={styles.formLabel}>Description (for this item in kit):</label>
                <textarea id={`kitItemDescription-${itemFormData.id}`} name="description" value={itemFormData.description || ''} onChange={handleItemFormInputChange} className={styles.formTextarea} rows={2}></textarea>
            </div>

            <button type="button" onClick={handleAddItemToKit} className={styles.createKitButton} style={{marginRight: '10px'}}>
                {editingItemIndex !== null ? 'Update Item in Kit' : 'Add This Item to Kit'}
            </button>
            <button type="button" onClick={() => {setShowItemForm(false); setEditingItemIndex(null); setItemFormData(initialKitItemFormData);}} className={styles.cancelButton}>
                Cancel Item
            </button>
        </div>
    );

    return (
        <div className={styles.pageContainer}>
             <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Manage Kits</h1>
                <Link to="/dashboard" className={styles.backLink}>Back to Dashboard</Link>
            </div>

            <div className={styles.tabNavigation}>
                <button className={`${styles.tabButton} ${activeTab === 'myKits' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('myKits')}>My Kits</button>
                <button className={`${styles.tabButton} ${activeTab === 'kitBuilder' ? styles.tabButtonActive : ''}`}
                    onClick={() => { if (!currentKitId) handleCreateNewKit(); else setActiveTab('kitBuilder'); }}>
                    {currentKitId ? 'Edit Kit Details' : 'Create New Kit'}
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'myKits' && (
                    <div>
                        <button onClick={handleCreateNewKit} className={styles.createKitButton}>+ Create New Kit</button>
                        {isLoadingKits && <p className={styles.loadingText}>Loading your kits...</p>}
                        {errorKits && <p className={styles.errorText}>{errorKits}</p>}
                        {!isLoadingKits && !errorKits && userKits.length === 0 && <p>You haven't created any kits yet.</p>}
                        {!isLoadingKits && !errorKits && userKits.length > 0 && (
                            <ul className={styles.kitList}>
                                {userKits.map(kit => (
                                    <li key={kit.id} className={styles.kitListItem}>
                                        <div className={styles.kitListItemInfo}>
                                            <h3>{kit.name}</h3>
                                            <p>{kit.description || 'No description.'}</p>
                                            <p><small>Items: {kit.lineItems?.length || 0} | Tags: {kit.tags?.join(', ') || 'None'}</small></p>
                                        </div>
                                        <div className={styles.kitListItemActions}>
                                            <button onClick={() => handleEditKit(kit)} className={styles.editButton}>Edit</button>
                                            <button onClick={() => handleDeleteKit(kit.id)} className={styles.deleteButton}>Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                {activeTab === 'kitBuilder' && (
                    <div className={styles.kitBuilderForm}>
                        <h2>{currentKitId ? `Edit Kit: ${kitName}` : 'Create New Kit'}</h2>
                        {kitBuilderError && <p className={styles.errorText}>{kitBuilderError}</p>}
                        {isLoadingGlobalData && <p className={styles.loadingText}>Loading item data...</p>}
                        
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>Kit Details</h3>
                            <div className={styles.formGroup}>
                                <label htmlFor="kitName" className={styles.formLabel}>Kit Name*:</label>
                                <input type="text" id="kitName" value={kitName} onChange={(e) => setKitName(e.target.value)} className={styles.formInput} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="kitDescription" className={styles.formLabel}>Description:</label>
                                <textarea id="kitDescription" value={kitDescription} onChange={(e) => setKitDescription(e.target.value)} className={styles.formTextarea} rows={3}></textarea>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="kitTags" className={styles.formLabel}>Tags (comma-separated):</label>
                                <input type="text" id="kitTags" value={kitTags} onChange={(e) => setKitTags(e.target.value)} className={styles.formInput} />
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>Kit Items ({kitLineItems.length})</h3>
                            {kitLineItems.length > 0 && (
                                <ul className={styles.kitItemsList}>
                                    {kitLineItems.map((item, index) => (
                                        <li key={index} className={styles.kitItem}>
                                            <span>{item.displayName} (Qty: {item.baseQuantity} {item.unit})</span>
                                            <div className={styles.kitItemActions}>
                                                <button onClick={() => handleEditKitItem(item, index)} className={styles.editButton} style={{fontSize:'0.8em', padding: '4px 8px'}}>Edit</button>
                                                <button onClick={() => handleRemoveKitItem(index)} className={styles.deleteButton} style={{fontSize:'0.8em', padding: '4px 8px'}}>Remove</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                             <button type="button" onClick={() => { setItemFormData({...initialKitItemFormData, id: uuidv4()}); setEditingItemIndex(null); setShowItemForm(true);}} style={{marginTop: '1rem'}}>
                                {showItemForm ? (editingItemIndex !== null ? '+ Add Another Item' : 'Cancel Item Form') : '+ Add Item to Kit'}
                            </button>
                        </div>
                        {kitBuilderItemForm}
                        <div className={styles.kitBuilderActions}>
                            <button onClick={handleSaveKit} disabled={isSavingKit} className={`${styles.saveKitButton} ${isSavingKit ? styles.saveKitButtonDisabled : ''}`}>
                                {isSavingKit ? 'Saving...' : (currentKitId ? 'Update Kit' : 'Save New Kit')}
                            </button>
                            <button onClick={() => { resetKitBuilderForm(); setActiveTab('myKits');}} className={styles.cancelButton} disabled={isSavingKit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <QuickAddMaterialModal
                isOpen={isKitItemQuickAddMaterialModalOpen}
                onClose={handleCloseKitItemQuickAddMaterialModal}
                onSave={handleSaveKitItemQuickAddMaterial}
                initialName={kitItemQuickAddMaterialInitialName}
            />
        </div>
    );
}

export default KitCreatorPage;