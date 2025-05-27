// src/components/QuoteBuilder.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection, query, getDocs, doc, addDoc, setDoc,
    Timestamp,
    serverTimestamp, writeBatch, getDoc,
    orderBy, runTransaction
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import {
    UserProfile, UserRateTemplate, Quote, QuoteLine, CombinedTask, CombinedMaterial, Task, CustomTask,
    Material, CustomMaterial, MaterialOption, KitTemplate, Area, KitLineItemTemplate,
    Client
} from '../types';

import { formatCurrency, findMatchingRate, groupLinesBySection } from '../utils/utils';

import TaskSelector from './TaskSelector';
import MaterialSelector from './MaterialSelector';
import MaterialOptionSelector from './MaterialOptionSelector';
import KitSelector from './KitSelector';
import QuoteLineItemDisplay from './QuoteLineItemDisplay';
import AreaSelector from './AreaSelector';
import TaskFormModal from './TaskFormModal';
import MaterialFormModal from './MaterialFormModal';

import styles from './QuoteBuilder.module.css';

interface QuoteBuilderProps {
    existingQuoteId?: string;
    onSaveSuccess?: (quoteId: string) => void;
}

function QuoteBuilder({ existingQuoteId, onSaveSuccess }: QuoteBuilderProps) {
    const itemSelectorRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth();
    const userId = currentUser?.uid;
    const navigate = useNavigate();

    // --- State ---
    const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
    const [userRates, setUserRates] = useState<UserRateTemplate[]>([]);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [errorRates, setErrorRates] = useState<string | null>(null);

    const [quoteData, setQuoteData] = useState<Partial<Quote>>({}); // For loaded existing quote or new quote shell
    const [jobTitle, setJobTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [terms, setTerms] = useState('');
    // State for new top-level quote fields
    const [projectDescription, setProjectDescription] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');
    const [validUntilDate, setValidUntilDate] = useState<Date | null>(null);


    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
    const [activeSection, setActiveSection] = useState<string>('');
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [errorQuote, setErrorQuote] = useState<string | null>(null);

    const [selectedTask, setSelectedTask] = useState<CombinedTask | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<CombinedMaterial | null>(null);
    const [selectedOption, setSelectedOption] = useState<MaterialOption | null>(null);
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
    const [selectedDescription, setSelectedDescription] = useState<string>(''); // For line item description
    const [overrideRateInput, setOverrideRateInput] = useState<string>('');

    const [globalAreas, setGlobalAreas] = useState<Area[]>([]);
    const [isLoadingAreas, setIsLoadingAreas] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const [allTasks, setAllTasks] = useState<CombinedTask[]>([]);
    const [allMaterials, setAllMaterials] = useState<CombinedMaterial[]>([]);
    const [isLoadingGlobals, setIsLoadingGlobals] = useState(false);

    const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
    const [taskFormInitialData, setTaskFormInitialData] = useState<CustomTask | null>(null);
    const createTaskPromiseRef = useRef<{ resolve: (value: CombinedTask | null) => void; reject: (reason?: any) => void; } | null>(null);

    const [isMaterialFormModalOpen, setIsMaterialFormModalOpen] = useState(false);
    const [materialFormInitialData, setMaterialFormInitialData] = useState<CustomMaterial | null>(null);
    const createMaterialPromiseRef = useRef<{ resolve: (value: CombinedMaterial | null) => void; reject: (reason?: any) => void; } | null>(null);

    const clearSelections = useCallback(() => {
        setSelectedTask(null); setSelectedMaterial(null); setSelectedOption(null);
        setSelectedQuantity(1); setOverrideRateInput(''); setSelectedDescription('');
    }, []);

    const currentItemDetails = useMemo(() => {
        const taskId = selectedTask?.id ?? null;
        const materialId = selectedMaterial?.id ?? null;
        const optionId = selectedMaterial?.optionsAvailable ? (selectedOption?.id ?? null) : null;
        const rateData = findMatchingRate(userRates, taskId, materialId, optionId);
        let effectiveRate = rateData?.referenceRate ?? selectedMaterial?.defaultRate ?? 0;
        let effectiveUnit = rateData?.unit ?? selectedMaterial?.defaultUnit ?? selectedTask?.defaultUnit ?? 'item';
        let effectiveInputType: QuoteLine['inputType'] = rateData?.inputType ?? (selectedMaterial ? 'quantity' : (selectedTask?.defaultUnit?.toLowerCase() === 'hour' ? 'quantity' : 'price'));
        const isHourly = ['hour', 'hr', 'hours'].includes(effectiveUnit.toLowerCase());
        effectiveRate = typeof effectiveRate === 'number' ? effectiveRate : 0;
        return { rateData, unit: effectiveUnit, rate: effectiveRate, inputType: effectiveInputType, isHourly };
    }, [selectedTask, selectedMaterial, selectedOption, userRates]);

    const validationIssues = useMemo(() => {
        const issues: string[] = [];
        if (!jobTitle.trim()) issues.push("Job Title is required.");
        if (!existingQuoteId && quoteLines.length === 0) issues.push("Add at least one line item for a new quote.");
        return issues;
    }, [jobTitle, quoteLines, existingQuoteId]);

    const isSaveDisabled = isLoadingQuote || validationIssues.length > 0 || !userId;
    const saveDisabledMessage = (validationIssues.length > 0 && !isLoadingQuote) ? `Cannot save: ${validationIssues.join(' ')}` : '';

    useEffect(() => { setOverrideRateInput(currentItemDetails.rate.toString()); }, [currentItemDetails.rate]);

    // --- Data Fetching useEffects ---

    useEffect(() => {
        if (!userId) {
            setUserProfile({});
            setTerms(''); // Clear terms if user logs out
            return;
        }
        const profileRef = doc(db, `users/${userId}`);
        getDoc(profileRef).then(docSnap => {
            if (docSnap.exists()) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                if (!existingQuoteId && terms.trim() === '' && profile.defaultQuoteTerms) {
                    setTerms(profile.defaultQuoteTerms);
                }
            } else {
                console.warn("User profile not found.");
                setUserProfile({});
                if (!existingQuoteId) setTerms('');
            }
        }).catch(err => {
            console.error("Error fetching user profile:", err);
            setUserProfile({});
            if (!existingQuoteId) setTerms('');
        });
    }, [userId, existingQuoteId]); // `terms` removed to avoid loop, it's set based on profile/client

    useEffect(() => {
        if (!userId) { setClients([]); return; }
        setIsLoadingClients(true);
        const clientsRef = collection(db, `users/${userId}/clients`);
        const qClients = query(clientsRef, orderBy('clientName', 'asc'));
        getDocs(qClients)
            .then(snapshot => setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client))))
            .catch(err => { console.error("Error fetching clients:", err); setErrorQuote("Failed to load clients."); })
            .finally(() => setIsLoadingClients(false));
    }, [userId]);

    useEffect(() => {
        if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client) {
                setClientName(client.clientName || '');
                setClientAddress(client.clientAddress || '');
                setClientEmail(client.clientEmail || '');
                setClientPhone(client.clientPhone || '');
                if (terms.trim() === '' && client.defaultClientTerms) {
                    setTerms(client.defaultClientTerms);
                }
            }
        } else if (!existingQuoteId) { // Only reset if no client selected AND it's a new quote
            setClientName('');
            setClientAddress('');
            setClientEmail('');
            setClientPhone('');
            setTerms(userProfile.defaultQuoteTerms || ''); // Reset to user profile default or empty
        }
    }, [selectedClientId, clients, existingQuoteId, userProfile.defaultQuoteTerms]);


    useEffect(() => {
        if (!userId) { setUserRates([]); return; }
        setIsLoadingRates(true);
        setErrorRates(null);
        const ratesCollectionRef = collection(db, `users/${userId}/rateTemplates`);
        const q = query(ratesCollectionRef, orderBy('displayName_lowercase', 'asc'));
        getDocs(q)
            .then(snap => setUserRates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRateTemplate))))
            .catch(err => { console.error("Error fetching rates:", err); setErrorRates("Failed to load rates."); })
            .finally(() => setIsLoadingRates(false));
    }, [userId]);

    useEffect(() => {
        setIsLoadingAreas(true);
        const areasRef = collection(db, 'areas');
        const qAreas = query(areasRef, orderBy('order', 'asc'), orderBy('name_lowercase', 'asc'));
        getDocs(qAreas)
            .then(snap => {
                const fetchedAreas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Area));
                setGlobalAreas(fetchedAreas);
            })
            .catch(err => {
                console.error("Error fetching areas:", err);
                setGlobalAreas([]);
            })
            .finally(() => setIsLoadingAreas(false));
    }, []);

    useEffect(() => {
        if (!existingQuoteId && !activeSection && globalAreas.length > 0 && !isLoadingAreas) {
            setActiveSection(globalAreas[0].name);
        } else if (!existingQuoteId && !activeSection && globalAreas.length === 0 && !isLoadingAreas) {
            setActiveSection('Main Area');
        }
    }, [existingQuoteId, globalAreas, isLoadingAreas, activeSection]);


    useEffect(() => {
        if (!userId) {
            setJobTitle(''); setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
            setTerms(''); setSelectedClientId(''); setQuoteLines([]); setQuoteData({});
            setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
            setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area');
            clearSelections(); setCollapsedSections({}); setIsLoadingQuote(false);
            return;
        }

        if (!existingQuoteId) {
            // Initialize for a new quote only if key fields are not already set (to avoid wiping user input on re-renders)
            if (jobTitle === '' && clientName === '' && quoteLines.length === 0 && projectDescription === '') {
                setIsLoadingQuote(true);
                setJobTitle(''); setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                setTerms(userProfile.defaultQuoteTerms || '');
                setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
                setSelectedClientId(''); setQuoteLines([]);
                setQuoteData({ status: 'Draft', userId: userId, terms: userProfile.defaultQuoteTerms || '' });
                if (!activeSection && globalAreas.length > 0) {
                    setActiveSection(globalAreas[0].name);
                } else if (!activeSection) {
                    setActiveSection('Main Area');
                }
                clearSelections(); setCollapsedSections({});
                setIsLoadingQuote(false);
            }
            return;
        }

        const fetchQuote = async () => {
            setIsLoadingQuote(true); setErrorQuote(null);
            const quoteRef = doc(db, 'users', userId, 'quotes', existingQuoteId);
            const linesRef = collection(db, 'users', userId, 'quotes', existingQuoteId, 'quoteLines');
            try {
                const quoteSnap = await getDoc(quoteRef);
                if (quoteSnap.exists()) {
                    const data = quoteSnap.data() as Quote;
                    setQuoteData(data); setJobTitle(data.jobTitle || '');
                    setClientName(data.clientName || ''); setClientAddress(data.clientAddress || '');
                    setClientEmail(data.clientEmail || ''); setClientPhone(data.clientPhone || '');
                    setTerms(data.terms || userProfile.defaultQuoteTerms || '');
                    setProjectDescription(data.projectDescription || '');
                    setAdditionalDetails(data.additionalDetails || '');
                    setGeneralNotes(data.generalNotes || '');
                    setValidUntilDate(data.validUntil ? data.validUntil.toDate() : null);

                    const loadedClient = clients.find(c => c.clientEmail === data.clientEmail || (c.clientName === data.clientName && c.clientAddress === data.clientAddress));
                    setSelectedClientId(loadedClient?.id || '');

                    const linesQuery = query(linesRef, orderBy('order'));
                    const linesSnap = await getDocs(linesQuery);
                    const fetchedLines = linesSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine));
                    setQuoteLines(fetchedLines);

                    if (fetchedLines.length > 0 && fetchedLines[0].section) {
                        setActiveSection(fetchedLines[0].section);
                    } else if (globalAreas.length > 0) {
                        setActiveSection(globalAreas[0].name);
                    } else {
                        setActiveSection('Main Area');
                    }
                    setCollapsedSections({});
                    clearSelections();
                } else {
                    setErrorQuote(`Quote not found: ${existingQuoteId}`);
                    setJobTitle(''); setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                    setTerms(userProfile.defaultQuoteTerms || ''); setSelectedClientId(''); setQuoteLines([]); setQuoteData({});
                    setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
                    setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area'); clearSelections();
                }
            } catch (err: any) {
                console.error("Error fetching quote:", err);
                setErrorQuote(`Failed to fetch quote: ${err.message}`);
            } finally {
                setIsLoadingQuote(false);
            }
        };
        fetchQuote();
    }, [existingQuoteId, userId, userProfile.defaultQuoteTerms, globalAreas, clients, clearSelections]);


    useEffect(() => {
        if (!userId) {
            setAllTasks([]);
            setAllMaterials([]);
            return;
        }
        setIsLoadingGlobals(true);
        const fetchAllReferencedData = async () => {
            try {
                const [tasksSnap, customTasksSnap, materialsSnap, customMaterialsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'tasks'), orderBy('name_lowercase', 'asc'))),
                    getDocs(query(collection(db, `users/${userId}/customTasks`), orderBy('name_lowercase', 'asc'))),
                    getDocs(query(collection(db, 'materials'), orderBy('name_lowercase', 'asc'))),
                    getDocs(query(collection(db, `users/${userId}/customMaterials`), orderBy('name_lowercase', 'asc')))
                ]);
                const globalTasks = tasksSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedTask;
                });
                const userCustomTasks = customTasksSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, isCustom: true, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedTask;
                });
                setAllTasks([...globalTasks, ...userCustomTasks].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
                const globalMaterialsData = materialsSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedMaterial;
                });
                const userCustomMaterialsData = customMaterialsSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, isCustom: true, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedMaterial;
                });
                setAllMaterials([...globalMaterialsData, ...userCustomMaterialsData].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            } catch (err) {
                console.error("Error fetching all tasks/materials for QuoteBuilder", err);
                setErrorQuote("Failed to load necessary task/material data.");
            } finally {
                setIsLoadingGlobals(false);
            }
        };
        fetchAllReferencedData();
    }, [userId]);

    const handleOpenNewTaskModal = (initialName?: string) => {
        return new Promise<CombinedTask | null>((resolve, reject) => {
            if (!userId) { alert("Login required."); reject(new Error("User not logged in")); return; }
            if (initialName) {
                const initialTaskData: CustomTask = {
                    id: `temp-new-${Date.now()}`,
                    name: initialName, name_lowercase: initialName.toLowerCase(),
                    defaultUnit: 'item', description: '', userId: userId,
                    createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                };
                setTaskFormInitialData(initialTaskData);
            } else { setTaskFormInitialData(null); }
            setIsTaskFormModalOpen(true);
            createTaskPromiseRef.current = { resolve, reject };
        });
    };
    const handleOpenNewMaterialModal = (initialName?: string) => {
        return new Promise<CombinedMaterial | null>((resolve, reject) => {
            if (!userId) { alert("Login required."); reject(new Error("User not logged in")); return; }
            if (initialName) {
                const initialMaterialData: CustomMaterial = {
                    id: `temp-new-${Date.now()}`, name: initialName, name_lowercase: initialName.toLowerCase(),
                    defaultUnit: 'item', description: '', optionsAvailable: false, userId: userId,
                    createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                };
                setMaterialFormInitialData(initialMaterialData);
            } else { setMaterialFormInitialData(null); }
            setIsMaterialFormModalOpen(true);
            createMaterialPromiseRef.current = { resolve, reject };
        });
    };
    const handleSaveTaskFromModal = async (taskDataFromModal: { name: string; defaultUnit: string; description: string }) => {
        if (!userId) {
            alert("Login required."); if (createTaskPromiseRef.current) createTaskPromiseRef.current.reject(new Error("User not logged in"));
            setIsTaskFormModalOpen(false); createTaskPromiseRef.current = null; return;
        }
        const newTaskData = {
            userId, name: taskDataFromModal.name.trim(), name_lowercase: taskDataFromModal.name.trim().toLowerCase(),
            defaultUnit: taskDataFromModal.defaultUnit.trim() || 'item', description: taskDataFromModal.description.trim(),
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };
        try {
            const docRef = await addDoc(collection(db, `users/${userId}/customTasks`), newTaskData);
            const createdTask: CombinedTask = {
                id: docRef.id, ...newTaskData, isCustom: true, name: newTaskData.name, name_lowercase: newTaskData.name_lowercase,
                createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
            } as CombinedTask;
            setAllTasks(prev => [...prev, createdTask].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            if (createTaskPromiseRef.current) createTaskPromiseRef.current.resolve(createdTask);
            setSelectedTask(createdTask); setIsTaskFormModalOpen(false);
        } catch (error) {
            console.error("Error saving custom task:", error); alert(`Failed to save task.`);
            if (createTaskPromiseRef.current) createTaskPromiseRef.current.reject(error);
        } finally { if (createTaskPromiseRef.current) createTaskPromiseRef.current = null; }
    };
    const handleMaterialSavedFromModal = async (savedMaterial: CustomMaterial | null) => {
        setIsMaterialFormModalOpen(false);
        if (savedMaterial && userId) {
            const newCombinedMaterial: CombinedMaterial = {
                ...savedMaterial, isCustom: true, name: savedMaterial.name || '',
                name_lowercase: (savedMaterial.name_lowercase || savedMaterial.name?.toLowerCase() || '')
            };
            setAllMaterials(prev => [...prev, newCombinedMaterial].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            if (createMaterialPromiseRef.current) createMaterialPromiseRef.current.resolve(newCombinedMaterial);
            setSelectedMaterial(newCombinedMaterial);
        } else { if (createMaterialPromiseRef.current) createMaterialPromiseRef.current.resolve(null); }
        createMaterialPromiseRef.current = null;
    };

    const handleTaskSelectForItemForm = (task: CombinedTask | null) => {
        setSelectedTask(task); if (task) { setSelectedMaterial(null); setSelectedOption(null); } setOverrideRateInput('');
    };
    const handleMaterialSelectForItemForm = (material: CombinedMaterial | null) => {
        setSelectedMaterial(material); setSelectedOption(null); setOverrideRateInput('');
    };
    const handleOptionSelectForItemForm = (option: MaterialOption | null) => {
        setSelectedOption(option); setOverrideRateInput('');
    };

    const handleAddLineItem = useCallback(() => {
        const taskId = selectedTask?.id ?? null;
        const materialId = selectedMaterial?.id ?? null;
        const optionId = selectedMaterial?.optionsAvailable ? (selectedOption?.id ?? null) : null;
        const optionObject = selectedMaterial?.optionsAvailable ? selectedOption : null;
        if (!taskId && !materialId) { alert("Please select a task or material."); return; }
        if (selectedMaterial?.optionsAvailable && !optionId) { alert(`Please select an option for ${selectedMaterial.name}.`); return; }
        if (!activeSection?.trim()) { alert("Please select or enter an active Section/Area first."); return; }
        const { unit, rate: calculatedRate, inputType } = currentItemDetails;
        const overrideRateValue = parseFloat(overrideRateInput);
        const finalRate = overrideRateInput.trim() !== '' && !isNaN(overrideRateValue) ? overrideRateValue : calculatedRate;
        if (isNaN(finalRate)) { alert("Invalid rate."); return; }
        let baseDisplayName = 'New Item';
        if (selectedTask && selectedMaterial && optionObject) baseDisplayName = `${selectedTask.name} - ${selectedMaterial.name} (${optionObject.name})`;
        else if (selectedTask && selectedMaterial) baseDisplayName = `${selectedTask.name} - ${selectedMaterial.name}`;
        else if (selectedMaterial && optionObject) baseDisplayName = `${selectedMaterial.name} (${optionObject.name})`;
        else if (selectedTask) baseDisplayName = selectedTask.name;
        else if (selectedMaterial) baseDisplayName = selectedMaterial.name;
        let lineTotal = inputType === 'price' ? finalRate : (selectedQuantity * finalRate);
        const newQuoteLine: Omit<QuoteLine, 'id'> = {
            section: activeSection.trim(),
            taskId,
            materialId,
            materialOptionId: optionId,
            materialOptionName: optionObject?.name ?? null,
            displayName: baseDisplayName,
            description: selectedDescription.trim() || null,
            quantity: currentItemDetails.inputType === 'quantity' ? selectedQuantity : null, // Use currentItemDetails.inputType here
            price: currentItemDetails.inputType === 'price' ? finalRate : null, // And here
            unit: unit || null, // Ensure unit is explicitly null if it's falsy (e.g., empty string, though 'item' is default)
            referenceRate: currentItemDetails.inputType === 'quantity' ? finalRate : null, // And here
            inputType: inputType || 'price', // Ensure inputType has a default if somehow null/undefined
            lineTotal,
            order: quoteLines.reduce((max, line) => Math.max(max, line.order ?? -1), -1) + 1,
        };
        setQuoteLines(prev => [...prev, { ...newQuoteLine, id: uuidv4() } as QuoteLine]);
        setCollapsedSections(prev => ({ ...prev, [activeSection.trim()]: false }));
        clearSelections();
    }, [activeSection, currentItemDetails, overrideRateInput, quoteLines, selectedDescription, selectedMaterial, selectedOption, selectedQuantity, selectedTask, clearSelections]);

    const handleKitSelected = useCallback((kit: KitTemplate) => {
        if (!activeSection?.trim()) { alert("Please select or enter an active Section/Area first."); return; }
        const linesToAdd: QuoteLine[] = [];
        const startingOrder = quoteLines.reduce((max, line) => Math.max(max, line.order ?? -1), -1) + 1;
        kit.lineItems.forEach((kitItem, index) => {
            const rateData = findMatchingRate(userRates, kitItem.taskId, kitItem.materialId, kitItem.materialOptionId);
            const materialFromState = kitItem.materialId ? allMaterials.find(m => m.id === kitItem.materialId) : undefined;
            const taskFromState = kitItem.taskId ? allTasks.find(t => t.id === kitItem.taskId) : undefined;
            const materialOptionNameFromKit = kitItem.materialOptionName || null;
            let lineRate = rateData?.referenceRate ?? materialFromState?.defaultRate ?? 0;
            let lineUnit = rateData?.unit ?? materialFromState?.defaultUnit ?? taskFromState?.defaultUnit ?? kitItem.unit ?? 'item';
            let lineInputType = rateData?.inputType ?? kitItem.inputType ?? 'quantity';
            let quantity = kitItem.baseQuantity || 1;
            let lineTotal = lineInputType === 'price' ? lineRate : (quantity * lineRate);
            const newLine: Omit<QuoteLine, 'id'> = {
                section: activeSection.trim(), taskId: kitItem.taskId, materialId: kitItem.materialId,
                materialOptionId: kitItem.materialOptionId, materialOptionName: materialOptionNameFromKit,
                displayName: kitItem.displayName,
                // Ensure description from kit is also handled (null if empty/undefined)
                description: (kitItem.description && kitItem.description.trim() !== "") ? kitItem.description.trim() : null,
                quantity: lineInputType === 'quantity' ? quantity : null,
                price: lineInputType === 'price' ? lineRate : null, unit: lineUnit,
                referenceRate: lineInputType === 'quantity' ? lineRate : null, inputType: lineInputType,
                lineTotal, order: startingOrder + index, kitTemplateId: kit.id,
            };
            linesToAdd.push({ ...newLine, id: uuidv4() } as QuoteLine);
        });
        setQuoteLines(prev => [...prev, ...linesToAdd]);
        setCollapsedSections(prev => ({ ...prev, [activeSection.trim()]: false }));
        clearSelections();
    }, [userRates, quoteLines, activeSection, clearSelections, allTasks, allMaterials]);

    const handleDeleteLineItem = useCallback((idToDelete: string) => { setQuoteLines(prev => prev.filter(line => line.id !== idToDelete)); }, []);

    const handleEditLineItem = useCallback(async (idToEdit: string) => {
        const lineToEdit = quoteLines.find(line => line.id === idToEdit);
        if (!lineToEdit) return;
        let taskToSet: CombinedTask | null = null;
        if (lineToEdit.taskId) { const found = allTasks.find(t => t.id === lineToEdit.taskId); if (found) taskToSet = { ...found, isCustom: 'userId' in found && !!found.userId };}
        setSelectedTask(taskToSet);
        let materialToSet: CombinedMaterial | null = null;
        if (lineToEdit.materialId) { const found = allMaterials.find(m => m.id === lineToEdit.materialId); if (found) materialToSet = { ...found, isCustom: 'userId' in found && !!found.userId };}
        setSelectedMaterial(materialToSet);
        let optionToSet: MaterialOption | null = null;
        if (materialToSet?.optionsAvailable && lineToEdit.materialOptionId && lineToEdit.materialOptionName) {
            optionToSet = { id: lineToEdit.materialOptionId, name: lineToEdit.materialOptionName } as MaterialOption; // Assuming structure for simplicity
        }
        setSelectedOption(optionToSet);
        setActiveSection(lineToEdit.section);
        setSelectedQuantity(lineToEdit.quantity ?? 1);
        const rateForEdit = lineToEdit.inputType === 'price' ? lineToEdit.price : lineToEdit.referenceRate;
        setOverrideRateInput(rateForEdit?.toString() ?? '');
        setSelectedDescription(lineToEdit.description || ''); // Populate line item description for editing
        setQuoteLines(prev => prev.filter(line => line.id !== idToEdit));
        alert(`"${lineToEdit.displayName}" loaded for editing. Modify above and click "Add Line Item" to re-add it to the quote.`);
        itemSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [quoteLines, allTasks, allMaterials]);

    const handleSetActiveSection = useCallback((name: string) => {
        setActiveSection(name);
    }, []);

    const handleNavigateToKitCreator = () => {
        navigate('/kit-creator');
    };

    const handleSaveQuote = async () => {
        if (!userId) {
            alert("User not logged in.");
            console.error('[SAVE QUOTE] Aborted: User not logged in.');
            return;
        }
        if (!jobTitle.trim()) {
            alert("Job Title is required.");
            console.error('[SAVE QUOTE] Aborted: Job Title is required.');
            return;
        }
        if (quoteLines.length === 0 && !existingQuoteId) {
            alert("At least one line item is required for a new quote.");
            console.error('[SAVE QUOTE] Aborted: New quote has no line items.');
            return;
        }
    
        console.log('[SAVE QUOTE] Initiated. ExistingQuoteId:', existingQuoteId);
        setIsLoadingQuote(true);
        setErrorQuote(null);
    
        const calculatedTotal = quoteLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        let quoteIdToUse = existingQuoteId;
        let finalQuoteNumber = quoteData?.quoteNumber; // Use existing quote number for updates initially
    
        console.log('[SAVE QUOTE] Line items in state before save attempt:', JSON.parse(JSON.stringify(quoteLines)));
        console.log('[SAVE QUOTE] User Profile for terms/defaults:', JSON.parse(JSON.stringify(userProfile)));
    
        try {
            const mainQuotePayload: any = {
                userId: userId, // Always ensure userId is part of the payload
                jobTitle: jobTitle.trim(),
                clientName: clientName.trim() || null,
                clientAddress: clientAddress.trim() || null,
                clientEmail: clientEmail.trim() || null,
                clientPhone: clientPhone.trim() || null,
                terms: terms.trim() || userProfile.defaultQuoteTerms?.trim() || null,
                status: quoteData?.status || 'Draft',
                totalAmount: calculatedTotal,
                updatedAt: serverTimestamp(),
                projectDescription: projectDescription.trim() || null,
                additionalDetails: additionalDetails.trim() || null,
                generalNotes: generalNotes.trim() || null,
                validUntil: validUntilDate ? Timestamp.fromDate(validUntilDate) : null,
            };
    
            const userQuotesCollectionRef = collection(db, 'users', userId, 'quotes');
            let quoteDocRef;
    
            if (!existingQuoteId) {
                console.log('[SAVE QUOTE] Creating new quote.');
                mainQuotePayload.createdAt = serverTimestamp();
    
                finalQuoteNumber = await runTransaction(db, async (transaction) => {
                    const profileRef = doc(db, `users/${userId}`);
                    const profileSnap = await transaction.get(profileRef);
                    if (!profileSnap.exists()) {
                        console.warn("[SAVE QUOTE TRANSACTION] User profile not found for quote numbering. Using fallback.");
                        // Consider how to handle this - maybe throw error to prevent quote creation without profile
                        return `TEMP-${Date.now().toString().slice(-6)}`;
                    }
                    const profile = profileSnap.data() as UserProfile;
                    const prefix = profile.quotePrefix || 'QT-';
                    const nextNum = profile.nextQuoteSequence || 1;
                    const padding = profile.quoteNumberPadding || 4; // Default padding
                    const newNumStr = nextNum.toString().padStart(padding, '0');
                    transaction.update(profileRef, { nextQuoteSequence: nextNum + 1 });
                    console.log(`[SAVE QUOTE TRANSACTION] Generated quote number: ${prefix}${newNumStr}`);
                    return `${prefix}${newNumStr}`;
                });
    
                if (!finalQuoteNumber) {
                    throw new Error("Failed to generate quote number from transaction.");
                }
                mainQuotePayload.quoteNumber = finalQuoteNumber;
    
                console.log('[SAVE QUOTE] Main payload for new quote:', JSON.parse(JSON.stringify(mainQuotePayload)));
                quoteDocRef = await addDoc(userQuotesCollectionRef, mainQuotePayload);
                quoteIdToUse = quoteDocRef.id;
                console.log('[SAVE QUOTE] New quote document created with ID:', quoteIdToUse);
            } else {
                console.log(`[SAVE QUOTE] Updating existing quote: ${existingQuoteId}`);
                if (!quoteIdToUse) { // Should be existingQuoteId
                    throw new Error("Quote ID missing for update (existingQuoteId was set).");
                }
                quoteDocRef = doc(userQuotesCollectionRef, quoteIdToUse);
                // Ensure quoteNumber is preserved or correctly handled for existing quotes
                mainQuotePayload.quoteNumber = finalQuoteNumber || 'N/A'; // Use existing or fallback
    
                console.log('[SAVE QUOTE] Main payload for updating quote:', JSON.parse(JSON.stringify(mainQuotePayload)));
                await setDoc(quoteDocRef, mainQuotePayload, { merge: true }); // Use setDoc with merge for updates
                console.log('[SAVE QUOTE] Existing quote document updated for ID:', quoteIdToUse);
            }
    
            if (!quoteIdToUse) {
                throw new Error("Critical: quoteIdToUse is undefined before processing line items.");
            }
    
            console.log(`[SAVE QUOTE] Preparing to process ${quoteLines.length} line items for quote ID: ${quoteIdToUse}`);
    
            const batch = writeBatch(db);
            const linesSubColRef = collection(db, 'users', userId, 'quotes', quoteIdToUse, 'quoteLines');
    
            if (existingQuoteId) {
                console.log('[SAVE QUOTE] Deleting existing line items...');
                const oldLinesSnap = await getDocs(query(linesSubColRef));
                if (oldLinesSnap.empty) {
                    console.log('[SAVE QUOTE] No existing lines found to delete.');
                } else {
                    oldLinesSnap.forEach(lineDoc => batch.delete(lineDoc.ref));
                    console.log(`[SAVE QUOTE] ${oldLinesSnap.size} existing line items added to delete batch.`);
                }
            }
    
            if (quoteLines.length > 0) {
                quoteLines.forEach((line, index) => {
                    const { id, ...dataToSave } = line; // Exclude client-side 'id'
    
                    // Start with the base object without kitTemplateId
                    // Ensure this type correctly reflects all fields from QuoteLine except 'id',
                    // and that kitTemplateId is string | undefined.
                    const sanitizedDataToSave: Omit<QuoteLine, 'id'> = {
                        section: dataToSave.section || "Default Section",
                        taskId: dataToSave.taskId || null,
                        materialId: dataToSave.materialId || null,
                        materialOptionId: dataToSave.materialOptionId || null,
                        materialOptionName: dataToSave.materialOptionName || null,
                        displayName: dataToSave.displayName || "Unnamed Item",
                        description: dataToSave.description || null,
                        quantity: dataToSave.quantity === undefined || dataToSave.quantity === null ? null : Number(dataToSave.quantity),
                        price: dataToSave.price === undefined || dataToSave.price === null ? null : Number(dataToSave.price),
                        unit: dataToSave.unit || null,
                        referenceRate: dataToSave.referenceRate === undefined || dataToSave.referenceRate === null ? null : Number(dataToSave.referenceRate),
                        inputType: dataToSave.inputType || 'price',
                        lineTotal: dataToSave.lineTotal === undefined || dataToSave.lineTotal === null ? 0 : Number(dataToSave.lineTotal),
                        order: dataToSave.order !== undefined ? Number(dataToSave.order) : index,
                        // kitTemplateId is initially omitted, will be added if valid
                    };
    
                    // Conditionally add kitTemplateId if it's a valid string
                    if (dataToSave.kitTemplateId && typeof dataToSave.kitTemplateId === 'string' && dataToSave.kitTemplateId.trim() !== "") {
                        sanitizedDataToSave.kitTemplateId = dataToSave.kitTemplateId.trim();
                    }
                    // If the condition above is false, sanitizedDataToSave.kitTemplateId remains undefined (as it was never added),
                    // which aligns with the Omit<QuoteLine, 'id'> type if kitTemplateId is optional.
    
                    // Declare newLineDocRef here, before it's used
                    const newLineDocRef = doc(linesSubColRef); // This is correct for generating a new doc ref
    
                    console.log(`[SAVE QUOTE] Line item ${index} - kitTemplateId on dataToSave (original):`, dataToSave.kitTemplateId, 'SANITIZED (final object being saved):', JSON.parse(JSON.stringify(sanitizedDataToSave)));
                    batch.set(newLineDocRef, sanitizedDataToSave);
                });

                console.log('[SAVE QUOTE] All line items added to batch.');
            } else {
                console.log('[SAVE QUOTE] No line items to add to this quote.');
            }
    
            console.log('[SAVE QUOTE] Committing batch operations...');
            await batch.commit();
            console.log('[SAVE QUOTE] Batch commit successful!');
    
            alert(`Quote ${existingQuoteId ? 'updated' : 'saved'}! Number: ${finalQuoteNumber}`);
            if (onSaveSuccess) {
                onSaveSuccess(quoteIdToUse);
            } else if (!existingQuoteId) {
                 navigate(`/existing-quotes`); // Navigate to edit mode for the new quote
            }
    
    
            // Resetting form for new quote or re-fetching for existing
            if (!existingQuoteId) {
                console.log('[SAVE QUOTE] Resetting form for new quote entry.');
                setJobTitle('');
                setSelectedClientId(''); // Also reset selected client ID
                setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                setTerms(userProfile.defaultQuoteTerms || '');
                setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
                setQuoteLines([]);
                setQuoteData({}); // Clear any old quote data
                setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area');
                clearSelections();
            } else {
                // Optionally re-fetch data for the edited quote to ensure UI consistency,
                // though the batch write should mean Firestore data is now current.
                // Forcing a re-fetch can be good if there are complex states.
                console.log('[SAVE QUOTE] Re-fetching data for updated quote:', quoteIdToUse);
                const updatedSnap = await getDoc(doc(db, 'users', userId, 'quotes', quoteIdToUse));
                if (updatedSnap.exists()) {
                    setQuoteData(updatedSnap.data() as Quote);
                }
                const updatedLines = await getDocs(query(collection(db, 'users', userId, 'quotes', quoteIdToUse, 'quoteLines'), orderBy('order')));
                setQuoteLines(updatedLines.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine)));
                console.log('[SAVE QUOTE] Fetched updated lines:', updatedLines.docs.map(d => d.data()));
    
            }
    
        } catch (error: any) {
            console.error("[SAVE QUOTE] CRITICAL ERROR in handleSaveQuote:", error);
            console.error("[SAVE QUOTE] Error Name:", error.name);
            console.error("[SAVE QUOTE] Error Message:", error.message);
            console.error("[SAVE QUOTE] Error Stack:", error.stack);
            let userMessage = `Failed to save quote: ${error.message || "Unknown error"}`;
            if (error.code) { // Firestore error codes
                userMessage += ` (Code: ${error.code})`;
            }
            setErrorQuote(userMessage);
            alert(userMessage);
        } finally {
            setIsLoadingQuote(false);
            console.log('[SAVE QUOTE] Process finished.');
        }
    };

    const groupedQuoteLines = useMemo(() => groupLinesBySection(quoteLines), [quoteLines]);
    const sortedSectionNames = useMemo(() => Object.keys(groupedQuoteLines).sort(), [groupedQuoteLines]);
    const toggleSectionCollapse = (name: string) => setCollapsedSections(prev => ({ ...prev, [name]: !prev[name] }));

    const isLoadingOverall = isLoadingGlobals || isLoadingRates || isLoadingAreas || isLoadingClients || isLoadingQuote;

    return (
        <div className={styles.quoteBuilderContainer}>
            <h2 className={styles.mainHeading}>
                {existingQuoteId ? `Edit Quote (#${quoteData?.quoteNumber || '...'})` : 'Create New Quote'}
            </h2>

            {isLoadingOverall && !isTaskFormModalOpen && !isMaterialFormModalOpen && <div className={styles.loadingMessage}>Loading essential data...</div>}
            {errorQuote && <p className={styles.errorMessage}>Quote Error: {errorQuote}</p>}
            {errorRates && <p className={styles.errorMessage}>Rates Error: {errorRates}</p>}

            {!isLoadingOverall && (
                <>
                     <div className={styles.headerSection}>
                         <div className={styles.headerInputGroup}>
                            <label htmlFor="jobTitle" className={styles.headerLabel}>Job Title:*</label>
                            <input id="jobTitle" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required className={styles.headerInput}/>
                         </div>

                         <div className={styles.headerInputGroup}>
                            <label htmlFor="clientSelector" className={styles.headerLabel}>Select Client (or type new):</label>
                            <select
                                id="clientSelector"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className={styles.headerInput}
                                disabled={isLoadingClients}
                            >
                                <option value="">-- Select Existing Client --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.clientName}</option>
                                ))}
                            </select>
                            {isLoadingClients && <small> Loading clients...</small>}
                         </div>

                         <div className={styles.headerInputGroup}>
                            <label htmlFor="clientName" className={styles.headerLabel}>Client Name:</label>
                            <input id="clientName" type="text" value={clientName} onChange={(e) => {setClientName(e.target.value); if(selectedClientId) setSelectedClientId('');}} placeholder="Or type new client name" className={styles.headerInput} />
                         </div>
                         <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                            <label htmlFor="clientAddress" className={styles.headerLabel}>Client Address:</label>
                            <textarea id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={2} className={styles.headerTextarea} />
                         </div>
                         <div className={styles.headerInputGroup}>
                            <label htmlFor="clientEmail" className={styles.headerLabel}>Client Email:</label>
                            <input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={styles.headerInput} />
                         </div>
                         <div className={styles.headerInputGroup}>
                            <label htmlFor="clientPhone" className={styles.headerLabel}>Client Phone:</label>
                            <input id="clientPhone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={styles.headerInput} />
                         </div>
                         <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                            <label htmlFor="terms" className={styles.headerLabel}>Terms:</label>
                            <textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className={styles.headerTextarea} placeholder="Default terms are loaded from your profile if set..." />
                         </div>
                         {/* New Input Fields */}
                         <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                            <label htmlFor="projectDescription" className={styles.headerLabel}>Project Description / Scope:</label>
                            <textarea
                                id="projectDescription"
                                value={projectDescription}
                                onChange={(e) => setProjectDescription(e.target.value)}
                                rows={4}
                                className={styles.headerTextarea}
                                placeholder="Detailed description of the project or scope of works..."
                            />
                        </div>
                        <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                            <label htmlFor="additionalDetails" className={styles.headerLabel}>Additional Details / Inclusions:</label>
                            <textarea
                                id="additionalDetails"
                                value={additionalDetails}
                                onChange={(e) => setAdditionalDetails(e.target.value)}
                                rows={3}
                                className={styles.headerTextarea}
                                placeholder="E.g., Specific materials included, site conditions, access notes..."
                            />
                        </div>
                        <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                            <label htmlFor="generalNotes" className={styles.headerLabel}>General Notes for Client:</label>
                            <textarea
                                id="generalNotes"
                                value={generalNotes}
                                onChange={(e) => setGeneralNotes(e.target.value)}
                                rows={3}
                                className={styles.headerTextarea}
                                placeholder="Any other notes for the client relevant to this quote..."
                            />
                        </div>
                        <div className={styles.headerInputGroup}>
                            <label htmlFor="validUntilDate" className={styles.headerLabel}>Quote Valid Until:</label>
                            <input
                                id="validUntilDate"
                                type="date"
                                value={validUntilDate ? validUntilDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setValidUntilDate(e.target.value ? new Date(e.target.value) : null)}
                                className={styles.headerInput}
                            />
                        </div>
                    </div>

                    <div className={styles.activeSectionContainer}>
                        <label className={styles.activeSectionLabel}>Working Area/Section:</label>
                        <AreaSelector
                            globalAreas={globalAreas}
                            activeSection={activeSection}
                            onChange={handleSetActiveSection}
                            isLoading={isLoadingAreas}
                        />
                        <span className={styles.activeSectionNote}>(Items added below go here)</span>
                    </div>

                    <div ref={itemSelectorRef} className={styles.itemSelector}>
                         <h3 className={styles.itemSelectorHeading}>Add New Item to "{activeSection || 'Default Section'}"</h3>
                         <div className={styles.selectorsGrid}>
                            <div className={styles.selectorWrapper}>
                                <TaskSelector
                                    userId={userId}
                                    onSelect={handleTaskSelectForItemForm}
                                    onCreateCustomTask={handleOpenNewTaskModal}
                                    isLoading={isLoadingGlobals || isLoadingRates}
                                    allTasks={allTasks}
                                />
                                <button onClick={() => handleOpenNewTaskModal()} className={styles.quickAddButton}>+ Task</button>
                            </div>
                            <div className={styles.selectorWrapper}>
                                <MaterialSelector
                                    userId={userId}
                                    onSelect={handleMaterialSelectForItemForm}
                                    onCreateCustomMaterial={handleOpenNewMaterialModal}
                                    isLoading={isLoadingGlobals || isLoadingRates}
                                    allMaterials={allMaterials}
                                />
                                <button onClick={() => handleOpenNewMaterialModal()} className={styles.quickAddButton}>+ Material</button>
                            </div>
                            {selectedMaterial && selectedMaterial.optionsAvailable && (
                                <MaterialOptionSelector
                                    selectedMaterial={selectedMaterial}
                                    onSelect={handleOptionSelectForItemForm}
                                    currentOptionId={selectedOption?.id}
                                />
                            )}
                         </div>
                         <div className={styles.kitSelectorContainer}>
                            <KitSelector userId={userId} onSelect={handleKitSelected} />
                            <button
                                onClick={handleNavigateToKitCreator}
                                className={styles.manageKitsButton}
                                title="Create or Edit Kits"
                            >
                                Create & Edit Kits
                            </button>
                         </div>

                         {(selectedTask || selectedMaterial) && (
                            <div className={styles.selectedItemsDetails}>
                                {selectedTask && <p>Task: {selectedTask.name} {selectedTask.isCustom ? '(Custom)' : ''}</p>}
                                {selectedMaterial && <p>Material: {selectedMaterial.name} {selectedMaterial.isCustom ? '(Custom)' : ''} {selectedMaterial.optionsAvailable ? '(Has Options)' : ''}</p>}
                                {selectedMaterial?.defaultRate !== undefined && <p><small>Material Base Rate: {formatCurrency(selectedMaterial.defaultRate)} / {selectedMaterial.defaultUnit}</small></p>}
                                {selectedOption && <p>Option: {selectedOption.name}</p>}
                                <p className={styles.calculatedRate}>
                                    Calculated Rate: {formatCurrency(currentItemDetails.rate)} / {currentItemDetails.unit}
                                    (Input Type: {currentItemDetails.inputType})
                                </p>
                            </div>
                         )}

                         <div className={styles.inputsGrid}>
                            {currentItemDetails.inputType === 'quantity' && (
                            <div className={styles.inputColumn}>
                                <label htmlFor="quantityInput" className={styles.inputLabel}>{currentItemDetails.isHourly ? 'Hours: ' : 'Quantity: '}</label>
                                <input id="quantityInput" type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(Number(e.target.value) || 0)} min="0" step="any" className={styles.formInput} />
                            </div>
                            )}
                            {(currentItemDetails.inputType === 'quantity' || currentItemDetails.inputType === 'price') && (
                            <div className={styles.inputColumn}>
                                <label htmlFor="rateInput" className={styles.inputLabel}>{currentItemDetails.inputType === 'quantity' ? 'Override Rate ($):' : 'Price ($):'}</label>
                                <input id="rateInput" type="number" placeholder={currentItemDetails.inputType === 'quantity' ? `Calc: ${currentItemDetails.rate.toFixed(2)}` : ''} value={overrideRateInput} onChange={e => setOverrideRateInput(e.target.value)} min="0" step="any" className={styles.formInput} />
                                {currentItemDetails.inputType === 'quantity' && <span className={styles.rateUnitSpan}> per {currentItemDetails.unit}</span>}
                            </div>
                            )}
                            <div className={styles.descriptionInputGroup}>
                                <label htmlFor="descriptionInput" className={styles.inputLabel}>Line Item Description/Notes:</label>
                                <textarea id="descriptionInput" value={selectedDescription} onChange={e => setSelectedDescription(e.target.value)} rows={2} className={styles.formTextarea}/>
                            </div>
                         </div>
                         <button
                            onClick={handleAddLineItem}
                            disabled={(!selectedTask && !selectedMaterial) || isLoadingQuote || !activeSection.trim()}
                            className={styles.addLineItemButton}
                            title={!activeSection.trim() ? "Please select an active section first" : ""}
                          >
                            Add Line Item
                          </button>
                    </div>

                    <div className="quote-builder__line-items">
                        <h3 className={styles.lineItemsSectionHeading}>Current Quote Items</h3>
                        {quoteLines.length === 0 && <p>No items added yet.</p>}
                        {sortedSectionNames.map(sectionName => {
                            const linesInSection = groupedQuoteLines[sectionName];
                            if (linesInSection.length === 0) return null;
                            const isCollapsed = collapsedSections[sectionName] ?? false;
                            const sectionSubtotal = linesInSection.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
                            return (
                                <div key={sectionName} className={styles.quoteSection}>
                                    <h4
                                        className={`${styles.sectionToggleHeader} ${isCollapsed ? styles.collapsed : ''}`}
                                        onClick={() => toggleSectionCollapse(sectionName)}
                                    >
                                        <span> {isCollapsed ? '▶' : '▼'} {sectionName} ({linesInSection.length} items) </span>
                                        <span className={styles.sectionSubtotal}>Subtotal: {formatCurrency(sectionSubtotal)}</span>
                                    </h4>
                                    {!isCollapsed && (
                                        <div className={styles.sectionContent}>
                                            <ul className={styles.sectionLineItemsList}>
                                                {linesInSection.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((line) => (
                                                    <QuoteLineItemDisplay
                                                        key={line.id}
                                                        item={line}
                                                        onDelete={handleDeleteLineItem}
                                                        onEdit={handleEditLineItem}
                                                    />
                                                ))}
                                            </ul>
                                            <button
                                                onClick={() => handleSetActiveSection(sectionName)}
                                                className={styles.addItemToSectionButton}
                                            >
                                                + Add another item to {sectionName}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                         })}
                    </div>

                    <div className={styles.actionsContainer}>
                         <button
                            onClick={handleSaveQuote}
                            disabled={isSaveDisabled}
                            className={`${styles.saveButton} ${isSaveDisabled ? styles.saveButtonDisabled : ''}`}
                         >
                             {isLoadingQuote ? 'Saving...' : (existingQuoteId ? 'Update Quote' : 'Save New Quote')}
                         </button>
                         {saveDisabledMessage && ( <span className={styles.saveDisabledMessage}>{saveDisabledMessage}</span> )}
                     </div>
                </>
            )}

            {userId && (
                <>
                    <TaskFormModal
                        isOpen={isTaskFormModalOpen}
                        onClose={() => {
                            setIsTaskFormModalOpen(false);
                            if (createTaskPromiseRef.current) {
                                createTaskPromiseRef.current.resolve(null);
                                createTaskPromiseRef.current = null;
                            }
                        }}
                        onSave={handleSaveTaskFromModal}
                        initialData={taskFormInitialData}
                        mode="add"
                    />

                    <MaterialFormModal
                        isOpen={isMaterialFormModalOpen}
                        onClose={() => {
                            setIsMaterialFormModalOpen(false);
                            if (createMaterialPromiseRef.current) {
                                createMaterialPromiseRef.current.resolve(null);
                                createMaterialPromiseRef.current = null;
                            }
                        }}
                        onSaveCallback={handleMaterialSavedFromModal}
                        userId={userId}
                        initialData={materialFormInitialData}
                        mode="add"
                    />
                </>
            )}
        </div>
    );
}

export default QuoteBuilder;