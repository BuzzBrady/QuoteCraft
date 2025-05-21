// src/components/QuoteBuilder.tsx
// -------------
// Main component for building/editing a quote.
// Using CSS Modules, shared utility functions, and client selection.
// Corrected typos in function calls.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    collection, query, getDocs, doc, addDoc, setDoc,
    Timestamp,
    serverTimestamp, writeBatch, getDoc,
    orderBy, runTransaction
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Contexts, Config, Types
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import {
    UserProfile, UserRateTemplate, Quote, QuoteLine, Task, CustomTask,
    Material, CustomMaterial, MaterialOption, KitTemplate, Area, KitLineItemTemplate,
    Client 
} from '../types';

// --- IMPORT SHARED UTILITY FUNCTIONS ---
import { formatCurrency, findMatchingRate, groupLinesBySection } from '../utils/utils'; 

// Child Components
import TaskSelector from './TaskSelector';
import MaterialSelector from './MaterialSelector';
import MaterialOptionSelector from './MaterialOptionSelector';
import KitSelector from './KitSelector';
import QuoteLineItemDisplay from './QuoteLineItemDisplay';
// import QuoteSummary from './QuoteSummary'; 
import AreaSelector from './AreaSelector';
import QuickAddMaterialModal from './QuickAddMaterialModal';

import styles from './QuoteBuilder.module.css'; 

type CombinedTask = (Task | CustomTask) & { isCustom?: boolean };
type CombinedMaterial = (Material | CustomMaterial) & { isCustom?: boolean; options?: MaterialOption[] };


interface QuoteBuilderProps {
    existingQuoteId?: string;
    onSaveSuccess?: (quoteId: string) => void; 
}

function QuoteBuilder({ existingQuoteId, onSaveSuccess }: QuoteBuilderProps) {
    const itemSelectorRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth();
    const userId = currentUser?.uid;

    // --- State ---
    const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
    const [userRates, setUserRates] = useState<UserRateTemplate[]>([]);
    const [isLoadingRates, setIsLoadingRates] = useState(false); // Keep if used by selectors
    const [errorRates, setErrorRates] = useState<string | null>(null);
    
    const [quoteData, setQuoteData] = useState<Partial<Quote>>({});
    const [jobTitle, setJobTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState(''); 
    const [clientEmail, setClientEmail] = useState('');     
    const [clientPhone, setClientPhone] = useState('');     
    const [terms, setTerms] = useState('');
    
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
    const [selectedDescription, setSelectedDescription] = useState<string>('');
    const [overrideRateInput, setOverrideRateInput] = useState<string>('');
    const [globalAreas, setGlobalAreas] = useState<Area[]>([]);
    const [isLoadingAreas, setIsLoadingAreas] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [isQuickAddMaterialModalOpen, setIsQuickAddMaterialModalOpen] = useState(false);
    const [quickAddMaterialInitialName, setQuickAddMaterialInitialName] = useState('');
    const createMaterialPromiseRef = useRef<{ resolve: (value: CombinedMaterial | null) => void; reject: (reason?: any) => void; } | null>(null);
    const [allTasks, setAllTasks] = useState<(Task | CustomTask)[]>([]);
    const [allMaterials, setAllMaterials] = useState<(Material | CustomMaterial)[]>([]);
    const [isLoadingGlobals, setIsLoadingGlobals] = useState(false);

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

    useEffect(() => {
        if (!userId) { setUserProfile({}); return; }
        const profileRef = doc(db, `users/${userId}`);
        getDoc(profileRef).then(docSnap => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
                if (!existingQuoteId && !terms && docSnap.data().defaultQuoteTerms) setTerms(docSnap.data().defaultQuoteTerms);
            } else console.warn("User profile not found.");
        }).catch(err => console.error("Error fetching user profile:", err));
    }, [userId, existingQuoteId, terms]);

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
                if (!terms.trim() && client.defaultClientTerms) setTerms(client.defaultClientTerms);
            }
        } else {
            if (!existingQuoteId) { 
                setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                setTerms(userProfile.defaultQuoteTerms || '');
            }
        }
    }, [selectedClientId, clients, terms, existingQuoteId, userProfile.defaultQuoteTerms]);

    useEffect(() => {
        if (!userId) { setUserRates([]); return; }
        setIsLoadingRates(true); setErrorRates(null);
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
                if (fetchedAreas.length > 0 && !activeSection && !existingQuoteId) setActiveSection(fetchedAreas[0].name);
            })
            .catch(err => console.error("Error fetching areas:", err))
            .finally(() => setIsLoadingAreas(false));
     }, [activeSection, existingQuoteId]);

     useEffect(() => {
        if (!existingQuoteId || !userId) {
            setQuoteLines([]); setJobTitle(''); 
            setClientName(quoteData?.clientName || ''); 
            setClientAddress(quoteData?.clientAddress || '');
            setClientEmail(quoteData?.clientEmail || '');
            setClientPhone(quoteData?.clientPhone || '');
            setTerms(quoteData?.terms || userProfile.defaultQuoteTerms || '');
            setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area');
            clearSelections(); setSelectedClientId(''); 
            return;
        };
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
                    const linesQuery = query(linesRef, orderBy('order'));
                    const linesSnap = await getDocs(linesQuery);
                    const fetchedLines = linesSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine));
                    setQuoteLines(fetchedLines);
                    if (fetchedLines.length > 0 && fetchedLines[0].section) setActiveSection(fetchedLines[0].section);
                    else if (globalAreas.length > 0) setActiveSection(globalAreas[0].name);
                    else setActiveSection('Main Area');
                    setCollapsedSections({});
                } else { setErrorQuote(`Quote not found.`); console.error(`Quote ${existingQuoteId} not found for user ${userId}`); }
            } catch (err: any) { console.error("Error fetching quote:", err); setErrorQuote(`Failed: ${err.message}`); }
            finally { setIsLoadingQuote(false); }
        };
        if (userId) fetchQuote();
    }, [existingQuoteId, userId, globalAreas, clearSelections, userProfile.defaultQuoteTerms, quoteData]);

    // Corrected typo: fetchAlIData -> fetchAllData
    useEffect(() => {
        if (!userId) return;
        setIsLoadingGlobals(true);
        const fetchAllData = async () => { // Renamed from fetchData to avoid conflict if any
            try {
                const [tasksSnap, customTasksSnap, materialsSnap, customMaterialsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'tasks'))),
                    getDocs(query(collection(db, `users/${userId}/customTasks`))),
                    getDocs(query(collection(db, 'materials'))),
                    getDocs(query(collection(db, `users/${userId}/customMaterials`)))
                ]);
                const globalTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                const userCustomTasks = customTasksSnap.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true } as CustomTask & { isCustom?: boolean }));
                setAllTasks([...globalTasks, ...userCustomTasks].sort((a, b) => a.name.localeCompare(b.name)));
                
                const globalMaterialsData = materialsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
                const userCustomMaterialsData = customMaterialsSnap.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true } as CustomMaterial & { isCustom?: boolean }));
                setAllMaterials([...globalMaterialsData, ...userCustomMaterialsData].sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                console.error("Error fetching all tasks/materials for QuoteBuilder", err);
                setErrorQuote("Failed to load necessary task/material data.");
            } finally {
                setIsLoadingGlobals(false);
            }
        };
        fetchAllData(); // Corrected function call
    }, [userId]);

    const handleCreateCustomTask = useCallback(async (taskName: string): Promise<CombinedTask | null> => {
        if (!userId) { alert("Login required."); return null; }
        if (!taskName?.trim()) { alert("Task name empty."); return null; }
        const defaultUnit = prompt(`Default unit for new task "${taskName}":`, 'item') || 'item';
        const newTaskData = { userId, name: taskName.trim(), name_lowercase: taskName.trim().toLowerCase(), defaultUnit, description: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        try {
            const docRef = await addDoc(collection(db, `users/${userId}/customTasks`), newTaskData);
            const createdTask: CombinedTask = { id: docRef.id, ...newTaskData, isCustom: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as CombinedTask;
            setAllTasks(prev => [...prev, createdTask].sort((a,b) => a.name.localeCompare(b.name)));
            return createdTask;
        } catch (error) { console.error("Error saving custom task:", error); alert(`Failed to save task "${taskName}".`); return null; }
    }, [userId]); 

    const initiateCreateCustomMaterial = useCallback((materialName: string): Promise<CombinedMaterial | null> => {
        return new Promise((resolve, reject) => {
            if (!userId) { alert("Login required."); reject(new Error("User not logged in")); return; }
            setQuickAddMaterialInitialName(materialName.trim());
            setIsQuickAddMaterialModalOpen(true);
            createMaterialPromiseRef.current = { resolve, reject };
        });
    }, [userId]);

    const handleSaveQuickAddMaterial = async (modalData: { name: string; description: string; optionsAvailable: boolean; defaultRate?: number; defaultUnit?: string; }) => {
        if (!userId || !createMaterialPromiseRef.current) {
            if (createMaterialPromiseRef.current) createMaterialPromiseRef.current.reject(new Error("Save conditions unmet."));
            createMaterialPromiseRef.current = null; setIsQuickAddMaterialModalOpen(false); return;
        }
        const { resolve, reject } = createMaterialPromiseRef.current;
        const newMatData = { userId, name: modalData.name, name_lowercase: modalData.name.toLowerCase(), description: modalData.description, optionsAvailable: modalData.optionsAvailable, defaultRate: modalData.defaultRate, defaultUnit: modalData.defaultUnit || 'item', searchKeywords: [modalData.name.toLowerCase()], createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        try {
            const docRef = await addDoc(collection(db, `users/${userId}/customMaterials`), newMatData);
            const createdMat: CombinedMaterial = { id: docRef.id, ...newMatData, isCustom: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
            setAllMaterials(prev => [...prev, createdMat].sort((a,b) => a.name.localeCompare(b.name)));
            resolve(createdMat);
        } catch (error) { console.error("Error saving quick-add material:", error); reject(error); }
        finally { setIsQuickAddMaterialModalOpen(false); createMaterialPromiseRef.current = null; }
    };

    const handleCloseQuickAddMaterialModal = () => {
        setIsQuickAddMaterialModalOpen(false);
        if (createMaterialPromiseRef.current) { createMaterialPromiseRef.current.resolve(null); createMaterialPromiseRef.current = null; }
    };

    // Corrected typo: handleTaskSelectForltemForm -> handleTaskSelectForItemForm
    const handleTaskSelectForItemForm = (task: CombinedTask | null) => {
        setSelectedTask(task); 
        if (task) { setSelectedMaterial(null); setSelectedOption(null); }
        setOverrideRateInput('');
    };

    // Corrected typo: handleMaterialSelectForltemForm -> handleMaterialSelectForItemForm
    const handleMaterialSelectForItemForm = (material: CombinedMaterial | null) => {
        setSelectedMaterial(material); 
        setSelectedOption(null); 
        setOverrideRateInput('');
    };
    
    // Corrected typo: handleOptionSelectFortemForm -> handleOptionSelectForItemForm
    const handleOptionSelectForItemForm = (option: MaterialOption | null) => {
        setSelectedOption(option);
        setOverrideRateInput('');
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
            section: activeSection.trim(), taskId, materialId, materialOptionId: optionId,
            materialOptionName: optionObject?.name ?? null, displayName: baseDisplayName,
            description: selectedDescription.trim() ? selectedDescription.trim() : undefined,
            quantity: inputType === 'quantity' ? selectedQuantity : null,
            price: inputType === 'price' ? finalRate : null, unit,
            referenceRate: inputType === 'quantity' ? finalRate : null, inputType, lineTotal,
            order: quoteLines.reduce((max, line) => Math.max(max, line.order ?? -1), -1) + 1,
        };
        setQuoteLines(prev => [...prev, { ...newQuoteLine, id: uuidv4() } as QuoteLine]);
        setCollapsedSections(prev => ({ ...prev, [activeSection.trim()]: false }));
        clearSelections();
    }, [activeSection, currentItemDetails, overrideRateInput, quoteLines, selectedDescription, selectedMaterial, selectedOption, selectedQuantity, selectedTask, clearSelections]);
    
    const handleKitSelected = useCallback((kit: KitTemplate) => {
        if (!activeSection?.trim()) { alert("Please select or enter an active Section/Area before adding a kit."); return; }
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
                displayName: kitItem.displayName, description: kitItem.description || undefined,
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
            optionToSet = { id: lineToEdit.materialOptionId, name: lineToEdit.materialOptionName } as MaterialOption;
        }
        setSelectedOption(optionToSet);
        setActiveSection(lineToEdit.section);
        setSelectedQuantity(lineToEdit.quantity ?? 1);
        const rateForEdit = lineToEdit.inputType === 'price' ? lineToEdit.price : lineToEdit.referenceRate;
        setOverrideRateInput(rateForEdit?.toString() ?? '');
        setSelectedDescription(lineToEdit.description || '');
        setQuoteLines(prev => prev.filter(line => line.id !== idToEdit));
        alert(`"${lineToEdit.displayName}" loaded. Modify and click "Add Line Item" to save changes.`);
        itemSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [quoteLines, allTasks, allMaterials]);

    const handleSetActiveSection = useCallback((name: string) => { setActiveSection(name); itemSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);

    const handleSaveQuote = async () => {
        if (!userId || !jobTitle.trim() || (quoteLines.length === 0 && !existingQuoteId)) {
            alert("User, Job Title, and at least one line item (for new quotes) are required."); return;
        }
        setIsLoadingQuote(true); setErrorQuote(null);
        const calculatedTotal = quoteLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        let quoteIdToUse = existingQuoteId;
        let finalQuoteNumber = quoteData?.quoteNumber;
        try {
            const mainQuotePayload: any = { 
                jobTitle: jobTitle.trim(),
                clientName: clientName.trim() || undefined,
                clientAddress: clientAddress.trim() || undefined, 
                clientEmail: clientEmail.trim() || undefined,
                clientPhone: clientPhone.trim() || undefined,
                terms: terms.trim() || userProfile.defaultQuoteTerms || undefined,
                status: quoteData?.status || 'Draft',
                totalAmount: calculatedTotal,
                projectDescription: quoteData?.projectDescription || undefined, 
                additionalDetails: quoteData?.additionalDetails || undefined,
                generalNotes: quoteData?.generalNotes || undefined,
                validUntil: quoteData?.validUntil || null,
                updatedAt: serverTimestamp(),
            };
            const userQuotesCollectionRef = collection(db, 'users', userId, 'quotes');
            let quoteDocRef;
            if (!existingQuoteId) {
                mainQuotePayload.userId = userId; mainQuotePayload.createdAt = serverTimestamp();
                finalQuoteNumber = await runTransaction(db, async (transaction) => {
                    const profileRef = doc(db, `users/${userId}`);
                    const profileSnap = await transaction.get(profileRef);
                    if (!profileSnap.exists()) { console.warn("Profile not found for numbering."); return `TEMP-${Date.now().toString().slice(-6)}`; }
                    const profile = profileSnap.data() as UserProfile;
                    const prefix = profile.quotePrefix || 'QT-';
                    const nextNum = profile.nextQuoteSequence || 1;
                    const padding = profile.quoteNumberPadding || 4;
                    const newNum = `${prefix}${nextNum.toString().padStart(padding, '0')}`;
                    transaction.update(profileRef, { nextQuoteSequence: nextNum + 1 });
                    return newNum;
                });
                if (!finalQuoteNumber) throw new Error("Failed to generate quote number.");
                mainQuotePayload.quoteNumber = finalQuoteNumber;
                quoteDocRef = await addDoc(userQuotesCollectionRef, mainQuotePayload);
                quoteIdToUse = quoteDocRef.id;
            } else {
                if (!quoteIdToUse) throw new Error("Quote ID missing for update.");
                quoteDocRef = doc(userQuotesCollectionRef, quoteIdToUse);
                if (finalQuoteNumber) mainQuotePayload.quoteNumber = finalQuoteNumber;
                await setDoc(quoteDocRef, mainQuotePayload, { merge: true });
            }
            if (!quoteIdToUse) throw new Error("Quote ID for line items is undefined.");
            const batch = writeBatch(db);
            const linesSubColRef = collection(db, 'users', userId, 'quotes', quoteIdToUse, 'quoteLines');
            if (existingQuoteId) { const oldLines = await getDocs(query(linesSubColRef)); oldLines.forEach(l => batch.delete(l.ref)); }
            quoteLines.forEach(line => { const { id, ...data } = line; batch.set(doc(linesSubColRef), data); });
            await batch.commit();
            alert(`Quote ${existingQuoteId ? 'updated' : 'saved'}! Number: ${finalQuoteNumber}`);
            if (onSaveSuccess) onSaveSuccess(quoteIdToUse);
            if (!existingQuoteId) {
                setQuoteLines([]); setJobTitle(''); 
                setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone(''); 
                setTerms(userProfile.defaultQuoteTerms || '');
                setQuoteData({}); setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area'); clearSelections();
                setSelectedClientId(''); 
            } else {
                const updatedSnap = await getDoc(doc(db, 'users', userId, 'quotes', quoteIdToUse));
                if (updatedSnap.exists()) setQuoteData(updatedSnap.data() as Quote);
                const updatedLines = await getDocs(query(collection(db, 'users', userId, 'quotes', quoteIdToUse, 'quoteLines'), orderBy('order')));
                setQuoteLines(updatedLines.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine)));
            }
        } catch (error: any) { console.error("Error saving quote:", error); setErrorQuote(`Failed: ${error.message}`); alert(`Failed: ${error.message}`);}
        finally { setIsLoadingQuote(false); }
    };
    
    const groupedQuoteLines = useMemo(() => groupLinesBySection(quoteLines), [quoteLines]);
    const sortedSectionNames = useMemo(() => Object.keys(groupedQuoteLines).sort(), [groupedQuoteLines]);
    const toggleSectionCollapse = (name: string) => setCollapsedSections(prev => ({ ...prev, [name]: !prev[name] }));
    
    const isLoading = isLoadingGlobals || isLoadingRates || isLoadingAreas || isLoadingClients || (existingQuoteId ? isLoadingQuote : false);

    return (
        <div className={styles.quoteBuilderContainer}>
            <h2 className={styles.mainHeading}>
                {existingQuoteId ? `Edit Quote (#${quoteData?.quoteNumber || '...'})` : 'Create New Quote'}
            </h2>
            
            {isLoading && !isQuickAddMaterialModalOpen && <div className={styles.loadingMessage}>Loading essential data...</div>}
            {errorQuote && <p className={styles.errorMessage}>Quote Error: {errorQuote}</p>}
            {errorRates && <p className={styles.errorMessage}>Rates Error: {errorRates}</p>}

            {!isLoading && (
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
                            <textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className={styles.headerTextarea} />
                         </div>
                    </div>

                    <div className={styles.activeSectionContainer}>
                        <label className={styles.activeSectionLabel}>Working Area/Section:</label>
                        <AreaSelector 
                            globalAreas={globalAreas} 
                            activeSection={activeSection} 
                            onChange={setActiveSection} 
                            isLoading={isLoadingAreas} 
                        />
                        <span className={styles.activeSectionNote}>(Items added below go here)</span>
                    </div>

                    <div ref={itemSelectorRef} className={styles.itemSelector}>
                         <h3 className={styles.itemSelectorHeading}>Add New Item to "{activeSection || 'Default Section'}"</h3>
                         <div className={styles.selectorsGrid}>
                            <TaskSelector
                                userId={userId}
                                onSelect={handleTaskSelectForItemForm} // Corrected
                                onCreateCustomTask={handleCreateCustomTask} 
                                isLoading={isLoadingGlobals || isLoadingRates}
                            />
                            <MaterialSelector
                                userId={userId}
                                onSelect={handleMaterialSelectForItemForm} // Corrected
                                onCreateCustomMaterial={initiateCreateCustomMaterial} 
                                isLoading={isLoadingGlobals || isLoadingRates}
                            />
                            {selectedMaterial && selectedMaterial.optionsAvailable && (
                                <MaterialOptionSelector
                                    selectedMaterial={selectedMaterial}
                                    onSelect={handleOptionSelectForItemForm} // Corrected
                                    currentOptionId={selectedOption?.id}
                                />
                            )}
                         </div>
                         <KitSelector userId={userId} onSelect={handleKitSelected} />

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
                                <label htmlFor="descriptionInput" className={styles.inputLabel}>Description/Notes for this item: </label> 
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
                    
                    {/* <QuoteSummary lines={quoteLines} /> */}

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

            <QuickAddMaterialModal
                isOpen={isQuickAddMaterialModalOpen}
                onClose={handleCloseQuickAddMaterialModal}
                onSave={handleSaveQuickAddMaterial}
                initialName={quickAddMaterialInitialName}
            />
        </div>
    );
}

export default QuoteBuilder;
